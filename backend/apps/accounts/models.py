import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


def normalize_email(email: str) -> str:
    """Emails are the login identity: trimmed and lower-cased, whole address."""
    return (email or "").strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_by_natural_key(self, username):
        return self.get(email=normalize_email(username))

    def create_user(self, email: str, password: str | None = None, **fields) -> "User":
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=normalize_email(email), **fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # they set one through the reset flow
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    """
    The platform's user. Email is the login identity.

    There is intentionally no `is_superuser` and no `role` field: every
    authority comes from `rbac.RoleAssignment` (docs/03_RBAC_MODEL.md).
    `PermissionsMixin` is not used for the same reason — Django's own
    permission tables would be a second, unaudited authorization system.
    """

    class Status(models.TextChoices):
        ACTIVE = "active"
        INACTIVE = "inactive"  # deactivated by an administrator
        ALUMNI = "alumni"  # graduated / left; history kept, cannot sign in

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=True)
    full_name = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["full_name", "email"]
        constraints = [
            # Belt and braces: the application normalises, the database refuses
            # two spellings of one address.
            models.UniqueConstraint(Lower("email"), name="user_email_ci_unique"),
        ]

    @property
    def is_active(self) -> bool:  # used by Django's auth backend to refuse sign-in
        return self.status == self.Status.ACTIVE

    @property
    def is_email_verified(self) -> bool:
        return self.email_verified_at is not None

    def save(self, *args, **kwargs):
        self.email = normalize_email(self.email)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    # --- RBAC target protocol (see apps.rbac.policy) ---
    def rbac_scopes(self):
        """A user sits inside the verticals they are an active member of this year."""
        from apps.memberships.models import Membership
        from apps.rbac.models import ScopeType

        ids = Membership.objects.filter(user=self, status=Membership.Status.ACTIVE, academic_year__is_current=True).values_list(
            "vertical_id", flat=True
        )
        return {(ScopeType.VERTICAL, vid) for vid in ids}
