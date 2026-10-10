"""
Appoint the organisation's first Super Admins on a fresh production database
(docs/28_A2_DEPLOYMENT_RUNBOOK.md, "Initial administrators").

Why a command: there is deliberately no Django admin site and no
`is_superuser` (apps.accounts.models.User), and `create_dev_user` refuses to
run without DEBUG. Until someone holds SUPER_ADMIN, nobody can assign roles
through the platform. This closes that gap without a public bootstrap
endpoint and without enabling DEBUG: it runs only where someone already has
a shell on the host (e.g. Render Shell).

Safety properties (each covered by apps/accounts/tests/test_bootstrap_super_admin.py):

- Never takes a password. The person sets their own through the existing
  invitation email (`send_password_reset(..., invite=True)`, 1-hour link).
- Never prints the reset token or link, and refuses mail backends that would
  write the link to logs or disk (console, file-based) or drop it (dummy).
- Works only while fewer than BOOTSTRAP_QUORUM (2, per N-5) people hold
  SUPER_ADMIN; afterwards it refuses and points at the platform. The count
  is taken under `lock_governance()`, so two concurrent runs cannot both
  appoint a "second" admin.
- Assigns SUPER_ADMIN in the shape privileged roles require (R7, ADR-010):
  GLOBAL scope, no academic year, no end date.
- Never changes an existing user's password; refuses inactive/alumni accounts.
- Audits every attempt, including refusals and a failed invitation.
- `--dry-run` runs every check and writes nothing, sends nothing, audits nothing.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.emails import send_password_reset
from apps.accounts.models import User, normalize_email
from apps.audit import service as audit
from apps.audit.models import AuditLog
from apps.rbac.models import Role, RoleAssignment, ScopeType
from apps.rbac.services import lock_governance

ROLE_KEY = "SUPER_ADMIN"
BOOTSTRAP_QUORUM = 2
ACTION = "governance.bootstrap_super_admin"
NOTE = "Appointed via manage.py bootstrap_super_admin"

# Backends that would leak the invitation link (console prints it to the log
# stream, filebased writes it to disk) or silently drop it (dummy).
UNSAFE_MAIL_BACKENDS = {
    "django.core.mail.backends.console.EmailBackend",
    "django.core.mail.backends.filebased.EmailBackend",
    "django.core.mail.backends.dummy.EmailBackend",
}


class Refusal(Exception):
    """A precondition failed; audited (unless dry run) and reported as a CommandError."""


def _mail_backend() -> str:
    return (getattr(settings, "MAILERS", {}).get("default") or {}).get("BACKEND", "")


def _super_admin_holder_ids() -> set:
    return set(
        RoleAssignment.objects.in_force()
        .filter(role__key=ROLE_KEY, scope_type=ScopeType.GLOBAL, user__status=User.Status.ACTIVE)
        .values_list("user_id", flat=True)
    )


class Command(BaseCommand):
    help = (
        "Appoint one of the first two Super Admins on a fresh database and email them an invitation "
        "to set their own password. Refuses once two Super Admins exist."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="The new Super Admin's email address (their login).")
        parser.add_argument("--full-name", default="", help="Required when the account does not exist yet.")
        parser.add_argument("--dry-run", action="store_true", help="Run every check; change nothing, send nothing.")
        parser.add_argument(
            "--resend",
            action="store_true",
            help="Re-send the invitation to an existing Super Admin who has not set a password yet.",
        )

    def handle(self, *args, email, full_name, dry_run, resend, **options):
        email = normalize_email(email)
        full_name = (full_name or "").strip()
        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError("That is not a valid email address.") from exc

        try:
            outcome = self._run(email=email, full_name=full_name, dry_run=dry_run, resend=resend)
        except Refusal as refusal:
            if not dry_run:
                audit.record(
                    None,
                    ACTION,
                    summary=f"Refused bootstrap of {email} as Super Admin: {refusal}",
                    target_type="accounts.user",
                    result=AuditLog.Result.DENIED,
                    after={"email": email},
                )
            raise CommandError(str(refusal)) from refusal

        user, send_invite, message = outcome
        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(f"{prefix}{message}")
        if dry_run:
            if send_invite:
                self.stdout.write(f"{prefix}Would email an invitation to {email}.")
            self.stdout.write(self.style.SUCCESS(f"{prefix}All checks passed. Nothing was changed."))
            return
        if send_invite:
            self._send_invite(user)

    # --- decision ---------------------------------------------------------

    def _run(self, *, email, full_name, dry_run, resend):
        backend = _mail_backend()
        if backend in UNSAFE_MAIL_BACKENDS:
            raise Refusal(
                f"Email is not configured for real delivery (MAILERS backend is {backend.rsplit('.', 2)[-2]}). "
                "The invitation link would be written to logs or lost. Configure SMTP first."
            )
        role = Role.objects.filter(key=ROLE_KEY).first()
        if role is None:
            raise Refusal("The SUPER_ADMIN role does not exist yet. Run `manage.py seed_rbac` first.")

        with transaction.atomic():
            lock_governance()  # serialise against any concurrent bootstrap or governance change
            holders = _super_admin_holder_ids()
            user = User.objects.select_for_update().filter(email=email).first()

            if user is not None and user.pk in holders:
                if not resend:
                    return user, False, f"{email} is already a Super Admin. Nothing to do."
                if user.has_usable_password():
                    raise Refusal(f"{email} has already set a password. Use 'Forgot password' on the sign-in page instead.")
                return user, True, f"{email} is a Super Admin who has not set a password yet."

            if resend:
                raise Refusal("--resend only applies to an existing Super Admin who has not set a password yet.")
            if len(holders) >= BOOTSTRAP_QUORUM:
                raise Refusal(
                    f"{len(holders)} Super Admins already exist. Bootstrap is closed; "
                    "an existing Super Admin assigns roles in the platform."
                )
            if user is not None and not user.is_active:
                raise Refusal(f"{email} exists but is {user.status}. Reactivate it in the platform first.")
            if user is None and not full_name:
                raise Refusal("--full-name is required to create a new account.")

            if dry_run:
                action = "assign SUPER_ADMIN to the existing account" if user else "create the account"
                invite = user is None or not user.has_usable_password()
                return user, invite, f"Would {action} {email} ({len(holders) + 1} of {BOOTSTRAP_QUORUM})."

            created = user is None
            if created:
                user = User.objects.create_user(email=email, password=None, full_name=full_name)
            assignment = RoleAssignment.objects.create(
                user=user,
                role=role,
                scope_type=ScopeType.GLOBAL,
                scope_id=None,
                academic_year=None,
                ends_at=None,
                note=NOTE,
                assigned_by=None,
            )
            audit.record(
                None,
                ACTION,
                target=assignment,
                summary=f"{email} appointed Super Admin by bootstrap ({len(holders) + 1} of {BOOTSTRAP_QUORUM}).",
                after={
                    "user": str(user.pk),
                    "email": email,
                    "role": ROLE_KEY,
                    "scope_type": ScopeType.GLOBAL,
                    "account_created": created,
                },  # fmt: skip
            )

        verb = "Created" if created else "Promoted existing account"
        if user.has_usable_password():
            return user, False, f"{verb} {email} as Super Admin. They already have a password and can sign in."
        return user, True, f"{verb} {email} as Super Admin."

    # --- invitation -------------------------------------------------------

    def _send_invite(self, user):
        try:
            send_password_reset(user, invite=True)
        except Exception as exc:  # SMTP/network errors: report the class only, never the payload
            audit.record(
                None,
                ACTION,
                target=user,
                summary=f"Invitation email to {user.email} failed ({type(exc).__name__}).",
                result=AuditLog.Result.ERROR,
            )
            raise CommandError(
                f"The role was assigned, but the invitation email to {user.email} failed ({type(exc).__name__}). "
                "Fix email delivery, then rerun with --resend."
            ) from exc
        hours = settings.PASSWORD_RESET_TIMEOUT // 3600
        self.stdout.write(
            self.style.SUCCESS(
                f"Invitation emailed to {user.email}. The link expires in {hours} hour{'s' if hours != 1 else ''}."
            )
        )
