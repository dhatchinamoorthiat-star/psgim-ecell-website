import logging
import threading
from concurrent.futures import Future, ThreadPoolExecutor

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)


def reset_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL.rstrip('/')}/platform/reset-password?uid={uid}&token={token}"


def send_password_reset(user, *, invite: bool = False) -> None:
    link = reset_link(user)
    hours = settings.PASSWORD_RESET_TIMEOUT // 3600
    if invite:
        subject = "Your PSGIM E-Cell platform account"
        intro = "An account has been created for you on the PSGIM E-Cell platform. Choose a password to sign in:"
    else:
        subject = "Reset your PSGIM E-Cell password"
        intro = "Someone (hopefully you) asked to reset the password for this account. Choose a new one here:"
    body = (
        f"Hello {user.full_name},\n\n{intro}\n\n{link}\n\n"
        f"The link works once and expires in {hours} hour{'s' if hours != 1 else ''}. "
        "If you did not expect this email, you can ignore it.\n\n— PSGIM E-Cell"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])


# --- Background dispatch (review findings F5) -------------------------------
#
# PasswordForgotView used to call send_password_reset() inline, so the
# request only paid for an SMTP round trip when the account existed — a
# timing side channel an attacker could use to enumerate accounts without
# ever looking at the (identical) response body. Phase 1 has no
# Redis/Celery, so the fix is the smallest thing that removes the
# request-time coupling: dispatch the send to a small, bounded, module-level
# worker pool and let the view return before it finishes.
#
# An earlier version of this fix used one raw `threading.Thread` per
# request with no cap. A follow-up security review correctly flagged that
# as a resource-exhaustion risk: an unbounded number of threads, each able
# to block forever on a stuck SMTP connection (no socket timeout was
# configured), could exhaust process resources under sustained request
# volume. This version fixes both halves of that:
#
#   - MAX_WORKERS bounds how many sends run concurrently. The executor is a
#     module-level singleton created once at import time, not per request.
#   - EMAIL_TIMEOUT (config/settings/base.py, plumbed into the SMTP
#     backend's `timeout` kwarg) bounds how long a single send can occupy a
#     worker, so a stuck mail server cannot permanently consume one.
#   - MAX_QUEUED bounds the backlog. concurrent.futures.ThreadPoolExecutor's
#     internal work queue has no size limit by default, which would just
#     move the "unbounded" problem from threads to queued callables. Once
#     MAX_QUEUED sends are already waiting, further requests drop the send
#     (logged) rather than queue indefinitely or block the request — Phase
#     1 has no durable queue, so a dropped send under sustained overload is
#     an accepted, documented trade-off (see docs), not a silent failure.
#
# Residual limitation (in-process dispatch, no durable queue): a worker
# process restart (deploy, crash, OOM) loses any send that had not yet
# completed. There is no persistence or retry. Accepted for Phase 1 per the
# no-Redis/Celery constraint; a user who does not receive a reset email can
# simply ask for another one.
#
# `join_pending()` exists only for tests, which otherwise cannot
# deterministically observe a fire-and-forget send.

MAX_WORKERS = 4  # concurrent sends; Render's Phase 1 tier runs one small dyno, not a mail farm
MAX_QUEUED = 50  # backlog cap — see "Residual limitation" above

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="password-reset-email")
_lock = threading.Lock()
_pending: list[Future] = []


def _send(user, invite: bool) -> None:
    try:
        send_password_reset(user, invite=invite)
    except Exception:
        # Never let a send failure vanish silently (review finding F5): this
        # is the only place an SMTP error surfaces, since the HTTP response
        # has already gone out by the time this runs.
        logger.exception("Failed to send password-reset email to %s.", user.email)


def send_password_reset_async(user, *, invite: bool = False) -> None:
    with _lock:
        _pending[:] = [f for f in _pending if not f.done()]
        if len(_pending) >= MAX_QUEUED:
            logger.error(
                "Password-reset email queue is full (%s already pending); dropping send for %s.",
                MAX_QUEUED,
                user.email,
            )
            return
        _pending.append(_executor.submit(_send, user, invite))


def join_pending(timeout: float = 5) -> None:
    """Test-only: block until every send_password_reset_async() call so far has finished."""
    with _lock:
        pending, _pending[:] = list(_pending), []
    for future in pending:
        future.result(timeout=timeout)
