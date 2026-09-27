from django.conf import settings
from django.db import models


class AppendOnlyError(Exception):
    """Raised when code tries to change or delete an audit row."""


class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise AppendOnlyError("The audit log is append-only.")

    def delete(self):
        raise AppendOnlyError("The audit log is append-only.")


class AuditLog(models.Model):
    """
    One row per privileged action or denied attempt (docs/09_AUDIT_LOG_SPECIFICATION.md).

    Append-only at the application layer: rows can be inserted, never updated
    or deleted through the ORM. Revoking UPDATE/DELETE from the database role
    is a deployment-time step (see docs/PHASE_1_IMPLEMENTATION_NOTES.md).

    Actor email and grants are copied, not only referenced, so the record
    still reads correctly after the user is renamed, demoted or deactivated.
    """

    class Result(models.TextChoices):
        SUCCESS = "SUCCESS"
        DENIED = "DENIED"
        ERROR = "ERROR"

    id = models.BigAutoField(primary_key=True)
    at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    actor_email = models.CharField(max_length=254, blank=True)
    actor_grants = models.JSONField(default=list, blank=True)
    action = models.CharField(max_length=100)  # dotted: "role.assign", "auth.login_failed"
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    summary = models.TextField()
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    result = models.CharField(max_length=10, choices=Result.choices, default=Result.SUCCESS)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    objects = AuditLogQuerySet.as_manager()

    class Meta:
        ordering = ["-at", "-id"]
        indexes = [
            models.Index(fields=["actor", "at"]),
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.at:%Y-%m-%d %H:%M} {self.action} {self.result}"

    def save(self, *args, **kwargs):
        if self.pk is not None and not self._state.adding:
            raise AppendOnlyError("The audit log is append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError("The audit log is append-only.")
