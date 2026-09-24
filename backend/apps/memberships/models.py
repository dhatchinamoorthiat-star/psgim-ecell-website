from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel


class AcademicYear(TimeStampedModel):
    """
    An organisational year, e.g. label "2026-27". Rows are data; no year is
    hard-coded anywhere. Exactly one may be current — enforced by a partial
    unique index, not only by application code.
    """

    label = models.CharField(max_length=20, unique=True)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-starts_on"]
        constraints = [
            models.UniqueConstraint(fields=["is_current"], condition=Q(is_current=True), name="one_current_academic_year"),
            models.CheckConstraint(condition=Q(ends_on__gt=F("starts_on")), name="academic_year_ends_after_start"),
        ]

    def __str__(self):
        return self.label

    @classmethod
    def current(cls) -> "AcademicYear | None":
        return cls.objects.filter(is_current=True).first()


class Membership(TimeStampedModel):
    """
    A user belonging to a vertical in a given academic year.

    Year-bound so history survives: leaving ends the row (status + left_at),
    it is never deleted. Next year's membership is a new row. A user may
    belong to several verticals.
    """

    class Status(models.TextChoices):
        ACTIVE = "active"
        ENDED = "ended"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="memberships")
    vertical = models.ForeignKey("verticals.Vertical", on_delete=models.PROTECT, related_name="memberships")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="memberships")
    title = models.CharField(max_length=120, blank=True)  # e.g. "Member", "Design lead"
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["-academic_year__starts_on", "vertical__display_order"]
        constraints = [
            models.UniqueConstraint(fields=["user", "vertical", "academic_year"], name="one_membership_per_user_vertical_year"),
            models.CheckConstraint(
                condition=Q(status="active", left_at__isnull=True) | Q(status="ended", left_at__isnull=False),
                name="membership_status_matches_left_at",
            ),
        ]
        indexes = [models.Index(fields=["academic_year", "vertical"])]

    def __str__(self):
        return f"{self.user} @ {self.vertical} ({self.academic_year})"

    def rbac_scopes(self):
        from apps.rbac.models import ScopeType

        return {(ScopeType.VERTICAL, self.vertical_id)}
