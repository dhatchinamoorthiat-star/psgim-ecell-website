from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import TimeStampedModel


class ScopeType(models.TextChoices):
    """
    Where a role assignment applies (docs/03_RBAC_MODEL.md).

    GLOBAL and VERTICAL are fully used in Phase 1. EVENT and PROJECT are
    accepted by the data model so Phase 2/3 need no migration of this table.
    "OWN" is not an assignment scope: it is a restriction on individual
    permissions inside a role (RolePermission.own_only).
    """

    GLOBAL = "GLOBAL"
    VERTICAL = "VERTICAL"
    EVENT = "EVENT"
    PROJECT = "PROJECT"


class Permission(models.Model):
    """A capability, e.g. `vertical.manage`. Rows mirror apps/rbac/catalogue.py; code enforces them."""

    code = models.CharField(max_length=80, primary_key=True)
    description = models.CharField(max_length=300)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code


class Role(TimeStampedModel):
    """
    A named bundle of permissions. Roles are never checked directly —
    only the permissions they carry are.
    """

    key = models.CharField(max_length=60, unique=True)  # e.g. VERTICAL_HEAD
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)  # seeded; cannot be deleted or edited through the API
    # Granting or revoking a privileged role additionally needs `role.manage`
    # at GLOBAL scope (only Super Admin holds it) — rule 2 in docs/03.
    is_privileged = models.BooleanField(default=False)
    # The permission an actor needs (at the target scope) to hand this role out.
    assign_permission = models.ForeignKey(Permission, on_delete=models.PROTECT, related_name="+", default="role.assign")
    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.PROTECT)
    # True = only over objects the user owns ("O" in the permission matrix).
    own_only = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["role", "permission"], name="unique_role_permission")]

    def __str__(self):
        return f"{self.role.key}: {self.permission_id}{' (own)' if self.own_only else ''}"


class RoleAssignmentQuerySet(models.QuerySet):
    def in_force(self, at=None):
        """Assignments that currently confer authority (not revoked, within dates, year current)."""
        at = at or timezone.now()
        return self.filter(
            Q(revoked_at__isnull=True),
            Q(starts_at__lte=at),
            Q(ends_at__isnull=True) | Q(ends_at__gt=at),
            Q(academic_year__isnull=True) | Q(academic_year__is_current=True),
        )


class RoleAssignment(TimeStampedModel):
    """
    user × role × scope (× optional academic year). The only source of
    authority in the platform.

    Assignments are never deleted: revoking sets revoked_at/by, so
    "who was Events Head in 2026-27" stays answerable.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="role_assignments")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="assignments")
    scope_type = models.CharField(max_length=10, choices=ScopeType.choices)
    scope_id = models.UUIDField(null=True, blank=True)
    academic_year = models.ForeignKey(
        "memberships.AcademicYear", null=True, blank=True, on_delete=models.PROTECT, related_name="role_assignments"
    )
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    note = models.CharField(max_length=300, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    objects = RoleAssignmentQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(scope_type="GLOBAL", scope_id__isnull=True) | (~Q(scope_type="GLOBAL") & Q(scope_id__isnull=False)),
                name="assignment_scope_id_matches_type",
            ),
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gt=models.F("starts_at")),
                name="assignment_ends_after_start",
            ),
            # One live assignment per user/role/scope — no duplicates to confuse revocation.
            models.UniqueConstraint(
                fields=["user", "role", "scope_type", "scope_id"],
                condition=Q(revoked_at__isnull=True),
                nulls_distinct=False,
                name="one_live_assignment_per_user_role_scope",
            ),
        ]
        indexes = [models.Index(fields=["user", "revoked_at"])]

    @property
    def is_active(self) -> bool:
        return RoleAssignment.objects.in_force().filter(pk=self.pk).exists()

    def rbac_scopes(self):
        """An assignment sits in the scope it grants; a GLOBAL one only in GLOBAL."""
        return set() if self.scope_type == ScopeType.GLOBAL else {(self.scope_type, self.scope_id)}

    def __str__(self):
        scope = self.scope_type if self.scope_type == ScopeType.GLOBAL else f"{self.scope_type}:{self.scope_id}"
        return f"{self.user} → {self.role.key} @ {scope}"
