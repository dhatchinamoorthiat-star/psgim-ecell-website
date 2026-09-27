"""Database-enforced invariants."""

from datetime import date

import pytest
from django.db import IntegrityError, transaction

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


def test_no_organisational_verticals_are_seeded(db):
    from apps.verticals.models import Vertical

    assert Vertical.objects.count() == 0  # production seed is gated by N-2
    assert not User.objects.exists()  # and no people (N-5)
