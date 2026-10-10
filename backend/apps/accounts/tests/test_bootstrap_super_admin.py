"""manage.py bootstrap_super_admin — first-Super-Admin bootstrap (docs/28_A2_DEPLOYMENT_RUNBOOK.md)."""

import re
import smtplib
from io import StringIO
from unittest import mock

import pytest
from django.core import mail
from django.core.management import CommandError, call_command
from django.test import override_settings

from apps.accounts.management.commands import bootstrap_super_admin as cmd
from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.rbac.models import Role, RoleAssignment, ScopeType
from conftest import grant, make_user

pytestmark = pytest.mark.django_db

CONSOLE = {"default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"}}
FILEBASED = {"default": {"BACKEND": "django.core.mail.backends.filebased.EmailBackend", "OPTIONS": {}}}
DUMMY = {"default": {"BACKEND": "django.core.mail.backends.dummy.EmailBackend"}}


def run(*args):
    out, err = StringIO(), StringIO()
    call_command("bootstrap_super_admin", *args, stdout=out, stderr=err)
    return out.getvalue() + err.getvalue()


def super_admins():
    return set(
        RoleAssignment.objects.in_force()
        .filter(role__key="SUPER_ADMIN", scope_type=ScopeType.GLOBAL)
        .values_list("user__email", flat=True)
    )


def audits(result=None):
    qs = AuditLog.objects.filter(action=cmd.ACTION)
    return qs.filter(result=result) if result else qs


# --- happy path --------------------------------------------------------------


def test_creates_account_assigns_role_and_emails_an_invitation():
    out = run("--email", "First.Admin@Example.org", "--full-name", "First Admin")

    user = User.objects.get(email="first.admin@example.org")  # normalised
    assert user.full_name == "First Admin"
    assert not user.has_usable_password()  # they choose it via the invitation
    assert super_admins() == {"first.admin@example.org"}
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["first.admin@example.org"]
    assert mail.outbox[0].subject == "Your PSGIM E-Cell platform account"
    assert "Invitation emailed" in out


def test_assignment_has_the_privileged_shape_r7():
    run("--email", "a@example.org", "--full-name", "A")
    a = RoleAssignment.objects.get(user__email="a@example.org")
    assert a.role.key == "SUPER_ADMIN"
    assert a.scope_type == ScopeType.GLOBAL and a.scope_id is None
    assert a.academic_year is None and a.ends_at is None and a.revoked_at is None
    assert a.assigned_by is None
    assert a.note == cmd.NOTE


def test_never_prints_the_token_or_the_link():
    out = run("--email", "a@example.org", "--full-name", "A")
    body = mail.outbox[0].body
    link = re.search(r"https?://\S+", body).group(0)
    token = re.search(r"token=([\w-]+)", link).group(1)
    assert link not in out and token not in out and "reset-password" not in out


def test_success_is_audited_as_a_system_action():
    run("--email", "a@example.org", "--full-name", "A")
    entry = audits(AuditLog.Result.SUCCESS).get()
    assert entry.actor is None
    assert entry.target_type == "rbac.roleassignment"
    assert entry.after["email"] == "a@example.org" and entry.after["account_created"] is True


def test_a_second_super_admin_is_allowed():
    run("--email", "a@example.org", "--full-name", "A")
    run("--email", "b@example.org", "--full-name", "B")
    assert super_admins() == {"a@example.org", "b@example.org"}


# --- quorum and existing accounts --------------------------------------------


def test_refuses_a_third_super_admin_and_audits_the_refusal():
    run("--email", "a@example.org", "--full-name", "A")
    run("--email", "b@example.org", "--full-name", "B")
    with pytest.raises(CommandError, match="Bootstrap is closed"):
        run("--email", "c@example.org", "--full-name", "C")
    assert not User.objects.filter(email="c@example.org").exists()
    assert audits(AuditLog.Result.DENIED).filter(after__email="c@example.org").exists()


def test_quorum_counts_super_admins_appointed_through_the_platform_too():
    grant(make_user("x@example.org"), "SUPER_ADMIN")
    grant(make_user("y@example.org"), "SUPER_ADMIN")
    with pytest.raises(CommandError, match="2 Super Admins already exist"):
        run("--email", "z@example.org", "--full-name", "Z")


def test_revoked_or_inactive_holders_do_not_count_towards_the_quorum():
    from django.utils import timezone

    revoked = grant(make_user("old@example.org"), "SUPER_ADMIN")
    revoked.revoked_at = timezone.now()
    revoked.save()
    gone = make_user("alumni@example.org", status=User.Status.ALUMNI)
    grant(gone, "SUPER_ADMIN")
    run("--email", "a@example.org", "--full-name", "A")
    run("--email", "b@example.org", "--full-name", "B")
    assert {"a@example.org", "b@example.org"} <= super_admins()


def test_rerun_for_an_existing_super_admin_is_a_no_op():
    run("--email", "a@example.org", "--full-name", "A")
    mail.outbox.clear()
    out = run("--email", "a@example.org")
    assert "already a Super Admin" in out
    assert RoleAssignment.objects.filter(user__email="a@example.org").count() == 1
    assert mail.outbox == []


def test_promotes_an_existing_account_without_touching_its_password():
    user = make_user("member@example.org", full_name="Existing Member")
    old_hash = user.password
    out = run("--email", "member@example.org")
    user.refresh_from_db()
    assert user.password == old_hash and user.full_name == "Existing Member"
    assert "member@example.org" in super_admins()
    assert mail.outbox == []  # they already have a password
    assert "already have a password" in out


def test_refuses_an_inactive_account():
    make_user("gone@example.org", status=User.Status.INACTIVE)
    with pytest.raises(CommandError, match="inactive"):
        run("--email", "gone@example.org")
    assert super_admins() == set()


def test_requires_a_full_name_for_a_new_account():
    with pytest.raises(CommandError, match="--full-name"):
        run("--email", "new@example.org")
    assert not User.objects.filter(email="new@example.org").exists()


def test_rejects_an_invalid_email():
    with pytest.raises(CommandError, match="valid email"):
        run("--email", "not-an-email", "--full-name", "X")


def test_refuses_when_roles_are_not_seeded():
    Role.objects.filter(key="SUPER_ADMIN").delete()
    with pytest.raises(CommandError, match="seed_rbac"):
        run("--email", "a@example.org", "--full-name", "A")


def test_takes_the_governance_lock():
    with mock.patch.object(cmd, "lock_governance") as lock:
        run("--email", "a@example.org", "--full-name", "A")
    lock.assert_called_once()


# --- email safety ------------------------------------------------------------


@pytest.mark.parametrize("mailers", [CONSOLE, FILEBASED, DUMMY], ids=["console", "filebased", "dummy"])
def test_refuses_mail_backends_that_would_leak_or_drop_the_link(mailers):
    with override_settings(MAILERS=mailers):
        with pytest.raises(CommandError, match="not configured for real delivery"):
            run("--email", "a@example.org", "--full-name", "A")
    assert not User.objects.filter(email="a@example.org").exists()


def test_invite_failure_keeps_the_role_reports_and_can_be_resent():
    with mock.patch.object(cmd, "send_password_reset", side_effect=smtplib.SMTPAuthenticationError(535, b"secret detail")):
        with pytest.raises(CommandError, match="--resend") as exc:
            run("--email", "a@example.org", "--full-name", "A")
    assert "secret detail" not in str(exc.value)
    assert "a@example.org" in super_admins()
    assert audits(AuditLog.Result.ERROR).exists()

    out = run("--email", "a@example.org", "--resend")
    assert len(mail.outbox) == 1 and "Invitation emailed" in out


def test_resend_refuses_once_a_password_is_set():
    run("--email", "a@example.org", "--full-name", "A")
    user = User.objects.get(email="a@example.org")
    user.set_password("a-long-enough-password-123")
    user.save()
    with pytest.raises(CommandError, match="Forgot password"):
        run("--email", "a@example.org", "--resend")


def test_resend_refuses_for_someone_who_is_not_a_super_admin():
    make_user("member@example.org")
    with pytest.raises(CommandError, match="--resend only applies"):
        run("--email", "member@example.org", "--resend")
    assert super_admins() == set()


# --- dry run -----------------------------------------------------------------


def test_dry_run_changes_nothing_sends_nothing_audits_nothing():
    out = run("--email", "a@example.org", "--full-name", "A", "--dry-run")
    assert "Would create the account" in out and "Nothing was changed" in out
    assert not User.objects.filter(email="a@example.org").exists()
    assert RoleAssignment.objects.count() == 0
    assert mail.outbox == []
    assert audits().count() == 0


def test_dry_run_still_reports_refusals_without_auditing_them():
    with override_settings(MAILERS=CONSOLE):
        with pytest.raises(CommandError, match="not configured"):
            run("--email", "a@example.org", "--full-name", "A", "--dry-run")
    assert audits().count() == 0


def test_works_without_debug():
    from django.conf import settings

    assert settings.DEBUG is False
    run("--email", "a@example.org", "--full-name", "A")
    assert super_admins() == {"a@example.org"}
