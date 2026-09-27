import uuid
from zoneinfo import available_timezones

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class TimeStampedModel(models.Model):
    """UUID primary key plus created/updated timestamps, for every domain table."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def validate_timezone(value: str) -> None:
    if value not in available_timezones():
        raise ValidationError(f"{value!r} is not an IANA timezone name.")


class OrganizationSettings(models.Model):
    """
    The single row of organisation-wide configuration (brief §16: timezone).

    A singleton: `load()` creates it on first use. Changing it requires the
    `system.settings` permission and is audited.
    """

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    name = models.CharField(max_length=200, default="PSGIM E-Cell")
    timezone = models.CharField(max_length=64, default="Asia/Kolkata", validators=[validate_timezone])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(id=1), name="organization_settings_singleton")]
        verbose_name_plural = "organization settings"

    def __str__(self):
        return self.name

    @classmethod
    def load(cls) -> "OrganizationSettings":
        obj, _ = cls.objects.get_or_create(id=1, defaults={"timezone": settings.ORG_TIMEZONE_DEFAULT})
        return obj
