"""Database-enforced invariants."""

from datetime import date

import pytest
from django.db import DatabaseError, IntegrityError, connection, transaction

from apps.accounts.models import User
from apps.audit.models import AppendOnlyError, AuditLog
from apps.memberships.models import AcademicYear, Membership
from apps.rbac.models import Role, RoleAssignment
from conftest import make_user, make_vertical

pytestmark = pytest.mark.django_db


def test_only_one_current_academic_year(year):
    with pytest.raises(IntegrityError), transaction.atomic():
        AcademicYear.objects.create(label="2099-00", starts_on=date(2099, 7, 1), ends_on=date(2100, 6, 30), is_current=True)


def test_academic_year_must_end_after_start(db):
    with pytest.raises(IntegrityError), transaction.atomic():
        AcademicYear.objects.create(label="bad", starts_on=date(2099, 7, 1), ends_on=date(2099, 1, 1))


def test_only_one_platform_custodian(db):
    make_vertical("one", is_platform_custodian=True)
    with pytest.raises(IntegrityError), transaction.atomic():
        make_vertical("two", is_platform_custodian=True)


def test_email_is_normalised_and_unique_case_insensitively(db):
    u = make_user("  Mixed@Case.Example ")
    assert u.email == "mixed@case.example"
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create(email="MIXED@case.example", full_name="dup")


def test_membership_unique_per_user_vertical_year(year):
    u, v = make_user("m@test.example"), make_vertical("v")
    Membership.objects.create(user=u, vertical=v, academic_year=year)
    with pytest.raises(IntegrityError), transaction.atomic():
        Membership.objects.create(user=u, vertical=v, academic_year=year)


def test_assignment_scope_must_match_type(db):
    u = make_user("x@test.example")
    role = Role.objects.get(key="MEMBER")
    with pytest.raises(IntegrityError), transaction.atomic():
        RoleAssignment.objects.create(user=u, role=role, scope_type="VERTICAL", scope_id=None)
    with pytest.raises(IntegrityError), transaction.atomic():
        RoleAssignment.objects.create(user=u, role=role, scope_type="GLOBAL", scope_id=make_vertical("q").pk)


def test_audit_log_is_append_only(db):
    row = AuditLog.objects.create(action="test.x", summary="x")
    row.summary = "changed"
    with pytest.raises(AppendOnlyError):
        row.save()
    with pytest.raises(AppendOnlyError):
        row.delete()
    with pytest.raises(AppendOnlyError):
        AuditLog.objects.all().update(summary="y")
    with pytest.raises(AppendOnlyError):
        AuditLog.objects.all().delete()


# --- Database-level enforcement (review finding F8) --------------------------------------------
#
# The trigger from apps/audit/migrations/0002_append_only_trigger.py must
# reject writes that never go through the Django ORM's AppendOnlyError at
# all — that's the whole point of a DB-level (not just application-level)
# guarantee. Each raw SQL statement runs in its own savepoint so the failed
# statement does not poison the outer test transaction.


def test_audit_log_insert_succeeds_at_the_database_level(db):
    row = AuditLog.objects.create(action="test.insert", summary="x")
    assert AuditLog.objects.filter(pk=row.pk).exists()


def test_audit_log_update_is_rejected_by_the_database_trigger(db):
    row = AuditLog.objects.create(action="test.update", summary="x")
    with pytest.raises(DatabaseError, match="append-only"), transaction.atomic():
        with connection.cursor() as cur:
            cur.execute("UPDATE audit_auditlog SET summary = %s WHERE id = %s", ["hacked", row.pk])
    row.refresh_from_db()
    assert row.summary == "x"


def test_audit_log_delete_is_rejected_by_the_database_trigger(db):
    row = AuditLog.objects.create(action="test.delete", summary="x")
    with pytest.raises(DatabaseError, match="append-only"), transaction.atomic():
        with connection.cursor() as cur:
            cur.execute("DELETE FROM audit_auditlog WHERE id = %s", [row.pk])
    assert AuditLog.objects.filter(pk=row.pk).exists()


def test_audit_log_truncate_is_rejected_by_the_database_trigger(db):
    """
    TRUNCATE never fires row-level BEFORE UPDATE/DELETE triggers in
    PostgreSQL — a security review found this let TRUNCATE wipe the whole
    table despite the UPDATE/DELETE triggers above. The fix is a separate
    statement-level BEFORE TRUNCATE trigger (same migration).
    """
    row = AuditLog.objects.create(action="test.truncate", summary="x")
    with pytest.raises(DatabaseError, match="append-only"), transaction.atomic():
        with connection.cursor() as cur:
            # The row just inserted has a deferred FK check pending (actor_id
            # is DEFERRABLE INITIALLY DEFERRED); PostgreSQL refuses TRUNCATE
            # on a table with pending trigger events in the same
            # transaction, for reasons unrelated to append-only enforcement.
            # Resolving it first lets the statement reach OUR trigger.
            cur.execute("SET CONSTRAINTS ALL IMMEDIATE")
            cur.execute("TRUNCATE audit_auditlog")
    assert AuditLog.objects.filter(pk=row.pk).exists()


def test_owning_role_can_disable_the_trigger_via_ddl(db):
    """
    Documents a real, accepted limitation (see the migration's docstring
    and docs/09_AUDIT_LOG_SPECIFICATION.md): the triggers stop ordinary DML
    from every role, including the table owner, but PostgreSQL ties the
    ability to disable or drop a trigger to table ownership, not to a
    revocable privilege. This project's single DATABASE_URL role owns the
    table, so it can always do this. Closing that gap needs a second,
    non-owning database role — a deployment/architecture decision, not
    something a migration can provide. This test exists so that claim
    cannot silently drift out of date: if this ever starts failing because
    PostgreSQL refuses the ALTER TABLE, the documentation is wrong and
    must be corrected, not the other way around.
    """
    row = AuditLog.objects.create(action="test.ddl", summary="x")
    with connection.cursor() as cur:
        # Same deferred-FK reason as the TRUNCATE test above: resolve the
        # pending trigger event from the INSERT before altering the table.
        cur.execute("SET CONSTRAINTS ALL IMMEDIATE")
        cur.execute("ALTER TABLE audit_auditlog DISABLE TRIGGER audit_auditlog_no_delete")
        try:
            cur.execute("DELETE FROM audit_auditlog WHERE id = %s", [row.pk])
        finally:
            cur.execute("ALTER TABLE audit_auditlog ENABLE TRIGGER audit_auditlog_no_delete")
    assert not AuditLog.objects.filter(pk=row.pk).exists()


def test_audit_log_survives_user_deactivation(db):
    """
    Deactivating a user is the only lifecycle event that touches their
    audit trail (there is no user-deletion path — see
    apps/accounts/tests/test_no_user_deletion.py). The audit rows about
    them must remain exactly as written.
    """
    actor = make_user("actor@test.example")
    target = make_user("target@test.example")
    row = AuditLog.objects.create(action="user.deactivate", actor=actor, actor_email=actor.email, target_type="accounts.user",
                                   target_id=str(target.pk), summary=f"{actor.email} deactivated {target.email}.")  # fmt: skip
    target.status = User.Status.INACTIVE
    target.save()
    row.refresh_from_db()
    assert row.summary == f"{actor.email} deactivated {target.email}."
    assert row.target_id == str(target.pk)


def test_no_organisational_verticals_are_seeded(db):
    from apps.verticals.models import Vertical

    assert Vertical.objects.count() == 0  # production seed is gated by N-2
    assert not User.objects.exists()  # and no people (N-5)
