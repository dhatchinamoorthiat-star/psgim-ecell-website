"""
Changing who holds which role. Every rule that stops privilege escalation
lives here (docs/03_RBAC_MODEL.md, "Anti-escalation rules", and ADR-010):

  R1  An actor may grant a role only if they hold each of its permissions at
      a scope covering the target — unless they hold `role.manage` globally
      (Super Admin governance; ADR-010).
  R2  Privileged roles (Role.is_privileged) need `role.manage` at GLOBAL scope.
  R3  At least one active user must keep `role.manage` at GLOBAL scope.
  R4  Nobody changes their own assignments.
  R5  Assigning needs the role's `assign_permission` at the target scope, so
      a vertical-scoped head can never create a GLOBAL assignment.
  R6  Every attempt is audited — including refusals (result=DENIED).

Refusals raise `EscalationDenied` (HTTP 403) or `Conflict` (HTTP 409). The
caller records DENIED audit rows via `deny()` so they survive the rollback.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit import service as audit
from apps.audit.models import AuditLog
from apps.core.exceptions import Conflict

from . import catalogue as P
from . import policy
from .models import Role, RoleAssignment, ScopeType
from .policy import ScopeTarget


class EscalationDenied(PermissionDenied):
    default_detail = "You do not have permission to make this assignment."


def _target_for(scope_type: str, scope_id):
    if scope_type == ScopeType.VERTICAL:
        from apps.verticals.models import Vertical

        vertical = Vertical.objects.filter(pk=scope_id, is_active=True).first()
        if vertical is None:
            raise ValidationError({"scope_id": ["No active vertical with this id."]})
        return vertical
    if scope_type == ScopeType.GLOBAL:
        if scope_id is not None:
            raise ValidationError({"scope_id": ["GLOBAL assignments have no scope_id."]})
        return ScopeTarget(ScopeType.GLOBAL)
    # EVENT / PROJECT objects arrive in Phases 2-3.
    raise ValidationError({"scope_type": [f"{scope_type} assignments are not available yet."]})


def _describe(assignment_or_role, scope_type, scope_id) -> dict:
    role = assignment_or_role if isinstance(assignment_or_role, Role) else assignment_or_role.role
    return {"role": role.key, "scope_type": scope_type, "scope_id": str(scope_id) if scope_id else None}


def governance_holders_after(excluding_assignment=None, excluding_user=None) -> int:
    """How many active users would still hold role.manage at GLOBAL scope."""
    qs = RoleAssignment.objects.in_force().filter(
        scope_type=ScopeType.GLOBAL,
        role__rolepermission__permission_id=P.ROLE_MANAGE,
        role__rolepermission__own_only=False,
        user__status="active",
    )
    if excluding_assignment is not None:
        qs = qs.exclude(pk=excluding_assignment.pk)
    if excluding_user is not None:
        qs = qs.exclude(user=excluding_user)
    return qs.values("user_id").distinct().count()


def _check_may_grant(actor, target_user, role: Role, target) -> None:
    if actor.pk == target_user.pk:
        raise EscalationDenied("You cannot change your own role assignments.")  # R4
    if not policy.has_perm(actor, role.assign_permission_id, target):
        raise EscalationDenied()  # R5
    is_governor = policy.has_perm(actor, P.ROLE_MANAGE)
    if role.is_privileged and not is_governor:
        raise EscalationDenied("Only a Super Admin can grant or revoke this role.")  # R2
    if not is_governor:  # R1
        for rp in role.rolepermission_set.all():
            if not policy.has_perm(actor, rp.permission_id, target) and not (
                rp.own_only and policy.scopes_for(actor, rp.permission_id, include_own_only=True).any
            ):
                raise EscalationDenied("You cannot grant permissions you do not hold yourself.")


def deny(request, action: str, summary: str, *, target=None, target_type="", target_id="", after=None) -> None:
    """Write a DENIED audit row in its own transaction (it must outlive the refused operation)."""
    with transaction.atomic():
        audit.record(
            request, action, summary=summary, target=target, target_type=target_type, target_id=target_id,
            after=after, result=AuditLog.Result.DENIED,
        )  # fmt: skip


def assign_role(request, *, user, role: Role, scope_type: str, scope_id=None, academic_year=None, ends_at=None, note=""):
    actor = request.user
    target = _target_for(scope_type, scope_id)
    detail = {**_describe(role, scope_type, scope_id), "user": str(user.pk)}
    try:
        _check_may_grant(actor, user, role, target)
    except EscalationDenied as exc:
        deny(request, "role.assign", f"Refused: {actor.email} tried to give {user.email} {role.key}.", target=user, after=detail)
        raise exc
    if not user.is_active:
        raise ValidationError({"user_id": ["This account is not active."]})
    if RoleAssignment.objects.filter(
        user=user, role=role, scope_type=scope_type, scope_id=scope_id, revoked_at__isnull=True
    ).exists():
        raise Conflict("This person already holds this role in this scope.")

    with transaction.atomic():
        assignment = RoleAssignment.objects.create(
            user=user, role=role, scope_type=scope_type, scope_id=scope_id, academic_year=academic_year,
            ends_at=ends_at, note=note, assigned_by=actor,
        )  # fmt: skip
        audit.record(
            request, "role.assign", target=assignment,
            summary=f"{actor.email} gave {user.email} the role {role.name} ({scope_type}).",
            after=detail,
        )  # fmt: skip
    policy.invalidate(user)
    return assignment


def revoke_assignment(request, assignment: RoleAssignment, reason: str = "") -> RoleAssignment:
    actor = request.user
    if assignment.revoked_at is not None:
        raise Conflict("This assignment has already been revoked.")
    target = _target_for(assignment.scope_type, assignment.scope_id) if assignment.scope_type in (
        ScopeType.GLOBAL, ScopeType.VERTICAL
    ) else ScopeTarget(assignment.scope_type, assignment.scope_id)  # fmt: skip
    detail = _describe(assignment, assignment.scope_type, assignment.scope_id)

    def refuse(exc):
        deny(request, "role.revoke", f"Refused: {actor.email} tried to revoke {assignment}.", target=assignment, after=detail)
        raise exc

    # Order matters: an unauthorised actor always gets 403 (no information
    # about the organisation's state); only an authorised one learns about
    # the last-Super-Admin invariant (409) — including about themselves.
    if assignment.role.is_privileged and not policy.has_perm(actor, P.ROLE_MANAGE):
        refuse(EscalationDenied("Only a Super Admin can grant or revoke this role."))
    confers_governance = (
        assignment.scope_type == ScopeType.GLOBAL
        and assignment.role.rolepermission_set.filter(permission_id=P.ROLE_MANAGE, own_only=False).exists()
    )

    if confers_governance and governance_holders_after(excluding_assignment=assignment) == 0:
        raise Conflict("This would leave the organisation without a Super Admin.")  # R3
    try:
        _check_may_grant(actor, assignment.user, assignment.role, target)  # revoking needs the same authority
    except EscalationDenied as exc:
        refuse(exc)

    with transaction.atomic():
        # Re-check R3 under a lock so two concurrent revocations cannot both pass it.
        list(RoleAssignment.objects.select_for_update().filter(scope_type=ScopeType.GLOBAL, revoked_at__isnull=True))
        if confers_governance and governance_holders_after(excluding_assignment=assignment) == 0:
            raise Conflict("This would leave the organisation without a Super Admin.")
        assignment.revoked_at = timezone.now()
        assignment.revoked_by = actor
        assignment.save(update_fields=["revoked_at", "revoked_by", "updated_at"])
        audit.record(
            request, "role.revoke", target=assignment,
            summary=f"{actor.email} revoked {assignment.role.name} from {assignment.user.email}." + (f" Reason: {reason}" if reason else ""),
            before=detail, after={**detail, "revoked": True},
        )  # fmt: skip
    policy.invalidate(assignment.user)
    return assignment
