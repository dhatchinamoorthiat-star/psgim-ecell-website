import logging
import threading
from concurrent.futures import Future, ThreadPoolExecutor

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

# Same bounded-executor shape as apps/accounts/emails.py, and for the same
# reason: the HTTP response must not wait on SMTP, but an unbounded pool of
# threads (or an unbounded backlog) is how that becomes an outage. A dropped
# notification is recoverable — the submission is already stored, and the
# platform Join inbox is the system of record, not the email.
MAX_WORKERS = 2
MAX_QUEUED = 50

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="join-notify-email")
_lock = threading.Lock()
_pending: list[Future] = []


def _body(submission) -> str:
    """
    Deliberately excludes the visitor's message and their IP hash. The email
    is a notification that something arrived, not a copy of it; the message
    is read in the platform, behind the permission check.
    """
    return (
        "A new membership-interest submission was received.\n\n"
        f"Name: {submission.name}\n"
        f"Email: {submission.email}\n"
        f"Programme / year: {submission.programme_or_year}\n"
        f"Source: {submission.source}\n\n"
        "Read it in the platform under Join submissions."
    )


def _send(submission) -> None:
    try:
        send_mail(
            subject="New membership-interest submission",
            message=_body(submission),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.JOIN_NOTIFY_EMAIL],
            fail_silently=False,
        )
    except Exception:
        # The submission is already committed; this must never surface to the
        # visitor, but it must not vanish either.
        logger.exception("Failed to send join-notification email for submission %s.", submission.pk)


def notify_new_submission_async(submission) -> None:
    """
    No-op unless JOIN_NOTIFY_EMAIL is configured. There is deliberately no
    default recipient: the Cell's address is still unconfirmed, and inventing
    one would send real applicants' details to an address nobody owns.
    """
    if not settings.JOIN_NOTIFY_EMAIL:
        return
    with _lock:
        _pending[:] = [f for f in _pending if not f.done()]
        if len(_pending) >= MAX_QUEUED:
            logger.error("Join-notification queue is full; dropping notification for submission %s.", submission.pk)
            return
        _pending.append(_executor.submit(_send, submission))


def join_pending(timeout: float = 5) -> None:
    """Test-only: block until every notify_new_submission_async() call so far has finished."""
    with _lock:
        pending, _pending[:] = list(_pending), []
    for future in pending:
        future.result(timeout=timeout)
