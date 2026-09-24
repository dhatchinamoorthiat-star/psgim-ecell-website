"""
The only way application code writes to the audit log.

Call `record()` inside the same `transaction.atomic()` block as the change it
describes, so a change can never commit without its audit row:

    with transaction.atomic():
        vertical.save()
        audit.record(request, "vertical.update", target=vertical, summary=..., before=..., after=...)

DENIED records are written outside any transaction that is about to roll
back — see `apps.rbac.api.PermissionedAPIView.require`.
"""

from ipaddress import ip_address

from apps.core.net import client_ip

from .models import AuditLog

# Never store these, whatever a caller passes in before/after.
_REDACT = {"password", "new_password", "token", "password_hash", "secret"}


def _clean(data):
    if isinstance(data, dict):
        return {k: ("[redacted]" if k in _REDACT else _clean(v)) for k, v in data.items()}
    if isinstance(data, list):
        return [_clean(v) for v in data]
    return data


def _valid_ip(value: str) -> str | None:
    try:
        return str(ip_address(value))
    except ValueError:
        return None


def record(
    request,
    action: str,
    *,
    summary: str,
    target=None,
    target_type: str = "",
    target_id: str = "",
    before: dict | None = None,
    after: dict | None = None,
    result: str = AuditLog.Result.SUCCESS,
    actor=None,
) -> AuditLog:
    if actor is None and request is not None:
        user = getattr(request, "user", None)
        actor = user if user is not None and user.is_authenticated else None

    if target is not None:
        target_type = target_type or target._meta.label_lower
        target_id = target_id or str(target.pk)

    grants = []
    if actor is not None:
        from apps.rbac.policy import grant_snapshot  # local import: rbac depends on audit

        grants = grant_snapshot(actor)

    return AuditLog.objects.create(
        actor=actor,
        actor_email=getattr(actor, "email", "") or "",
        actor_grants=grants,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary,
        before=_clean(before),
        after=_clean(after),
        result=result,
        ip=_valid_ip(client_ip(request)) if request is not None else None,
        user_agent=(request.headers.get("User-Agent", "")[:300] if request is not None else ""),
        request_id=getattr(request, "request_id", "") if request is not None else "",
    )
