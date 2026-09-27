from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class Vertical(TimeStampedModel):
    """
    A team of the E-Cell (Events, Technical, ...). Verticals are rows, never
    code constants: there is no enum of names or slugs anywhere in the
    codebase (docs/ORGANIZATIONAL_STRUCTURE.md). Code may only look at the
    `is_platform_custodian` flag.

    No organisational verticals are seeded — the authoritative list is gated
    by N-2 in docs/PHASE_1_AUTHORIZATION.md.

    Verticals are archived, not deleted, so their history stays attached.
    """

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    # The vertical that looks after the platform itself (Technical). At most one.
    is_platform_custodian = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["display_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_platform_custodian"],
                condition=Q(is_platform_custodian=True),
                name="one_platform_custodian_vertical",
            ),
            models.CheckConstraint(
                condition=Q(is_active=True, archived_at__isnull=True) | Q(is_active=False),
                name="active_vertical_not_archived",
            ),
        ]

    def __str__(self):
        return self.name

    # --- RBAC target protocol (see apps.rbac.policy) ---
    def rbac_scopes(self):
        from apps.rbac.models import ScopeType

        return {(ScopeType.VERTICAL, self.id)}
