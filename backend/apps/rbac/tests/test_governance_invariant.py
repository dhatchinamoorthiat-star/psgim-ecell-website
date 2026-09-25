"""
The governance invariant: the organisation must never be left without an
active user holding `role.manage` globally (R3), and privileged roles are
GLOBAL and open-ended (R7). Regression tests for review findings F1 and F6.
"""

import threading
import time
from datetime import date, timedelta

import pytest
from django.db import connection
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.memberships.models import AcademicYear
from apps.rbac import policy
from apps.rbac.models import RoleAssignment
from apps.rbac.services import governance_holders_after
from conftest import client_for, grant

pytestmark = pytest.mark.django_db

PRIVILEGED = ["SUPER_ADMIN", "ADMIN_HEAD", "TECHNICAL_HEAD"]


def assign(actor, body):
    return client_for(actor).post("/api/v1/role-assignments", body)


# --- R7: privileged assignments are GLOBAL, year-free and open-ended -------------------------------


@pytest.mark.parametrize("role", PRIVILEGED)
def test_privileged_role_with_vertical_scope_is_rejected(org, role):
    r = assign(
        org["super_admin"],
        {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "VERTICAL", "scope_id": str(org["vertical_a"].pk)},
    )
    assert r.status_code == 400 and "scope_type" in r.json()["error"]["fields"]
    assert not RoleAssignment.objects.filter(user=org["member_a"], role__key=role).exists()


@pytest.mark.parametrize("role", PRIVILEGED)
def test_privileged_role_with_academic_year_is_rejected(org, role):
    r = assign(
        org["super_admin"],
        {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "GLOBAL", "academic_year_id": str(org["year"].pk)},
    )
    assert r.status_code == 400 and "academic_year_id" in r.json()["error"]["fields"]
    assert not RoleAssignment.objects.filter(user=org["member_a"], role__key=role).exists()


@pytest.mark.parametrize("role", PRIVILEGED)
def test_privileged_role_with_end_date_is_rejected(org, role):
    ends = (timezone.now() + timedelta(days=30)).isoformat()
    r = assign(org["super_admin"], {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "GLOBAL", "ends_at": ends})
    assert r.status_code == 400 and "ends_at" in r.json()["error"]["fields"]
    assert not RoleAssignment.objects.filter(user=org["member_a"], role__key=role).exists()


@pytest.mark.parametrize("role", PRIVILEGED)
def test_valid_global_open_ended_privileged_role_is_accepted(org, role):
    r = assign(org["super_admin"], {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "GLOBAL"})
    assert r.status_code == 201, r.content
    a = RoleAssignment.objects.get(pk=r.json()["id"])
    assert (a.scope_type, a.academic_year_id, a.ends_at) == ("GLOBAL", None, None)


def test_shape_rule_does_not_leak_to_unauthorised_actors(org):
    """Someone who may not grant the role gets 403, not a 400 describing the rule."""
    r = assign(
        org["admin_head"],
        {
            "user_id": str(org["member_a"].pk),
            "role": "SUPER_ADMIN",
            "scope_type": "VERTICAL",
            "scope_id": str(org["vertical_a"].pk),
        },
    )
    assert r.status_code == 403


def test_non_privileged_roles_may_still_be_scoped_and_time_limited(org):
    ends = (timezone.now() + timedelta(days=30)).isoformat()
    r = assign(
        org["admin_head"],
        {"user_id": str(org["outsider"].pk), "role": "MEMBER", "scope_type": "VERTICAL", "scope_id": str(org["vertical_b"].pk),
         "academic_year_id": str(org["year"].pk), "ends_at": ends},
    )  # fmt: skip
    assert r.status_code == 201, r.content


# --- R3 across an academic-year switch ---------------------------------------------------------------


def _next_year():
    return AcademicYear.objects.create(label="2099-00", starts_on=date(2099, 7, 1), ends_on=date(2100, 6, 30))


def test_switching_year_cannot_eliminate_the_last_super_admin(org, year):
    # Legacy/hand-made data: every governor bound to the current year (R7 now prevents creating this via the API).
    RoleAssignment.objects.filter(role__key="SUPER_ADMIN").update(academic_year=year)
    nxt = _next_year()
    r = client_for(org["super_admin"]).post(f"/api/v1/academic-years/{nxt.pk}/make-current")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"
    year.refresh_from_db()
    nxt.refresh_from_db()
    assert year.is_current and not nxt.is_current  # rolled back
    assert not AuditLog.objects.filter(action="academic_year.set_current").exists()
    policy.invalidate(org["super_admin"])
    assert governance_holders_after() == 2


def test_switching_year_is_allowed_while_a_governor_remains(org, year):
    RoleAssignment.objects.filter(user=org["super_admin_2"], role__key="SUPER_ADMIN").update(academic_year=year)
    nxt = _next_year()
    assert client_for(org["super_admin"]).post(f"/api/v1/academic-years/{nxt.pk}/make-current").status_code == 200
    assert governance_holders_after() == 1


# --- R3 on deactivation ------------------------------------------------------------------------------


def test_deactivating_the_last_super_admin_is_rejected(org):
    """
    Through the API only the last Super Admin can attempt this (anyone else able to manage a
    privileged account is themselves a governor), and self-deactivation is refused first: 403.
    The 409 path — the invariant refusing — is proven by the concurrency test below, where the
    second deactivation is exactly "deactivate the last Super Admin".
    """
    RoleAssignment.objects.filter(user=org["super_admin_2"]).update(revoked_at=timezone.now())
    r = client_for(org["super_admin"]).post(f"/api/v1/users/{org['super_admin'].pk}/deactivate")
    assert r.status_code == 403
    org["super_admin"].refresh_from_db()
    assert org["super_admin"].is_active
    assert governance_holders_after() == 1


def test_invariant_refuses_removing_the_only_governor(org):
    from apps.core.exceptions import Conflict
    from apps.rbac.services import ensure_governance_remains

    RoleAssignment.objects.filter(user=org["super_admin_2"]).update(revoked_at=timezone.now())
    with pytest.raises(Conflict):
        ensure_governance_remains(excluding_user=org["super_admin"])
    ensure_governance_remains(excluding_user=org["member_a"])  # removing a non-governor is fine


@pytest.mark.django_db(transaction=True)
def test_concurrent_deactivation_never_removes_all_governors(monkeypatch):
    """
    Two Super Admins deactivate each other at the same moment. The delay after the invariant
    check widens the race window: without the governance lock both checks would pass and the
    organisation would be left with no governor. With the lock, exactly one succeeds.
    (Verified to fail when lock_governance() is removed from the deactivate view.)
    """
    from apps.accounts import views_users
    from apps.rbac.management.commands.seed_rbac import seed_rbac
    from conftest import make_user

    seed_rbac()
    a, b = make_user("race-a@test.example"), make_user("race-b@test.example")
    grant(a, "SUPER_ADMIN")
    grant(b, "SUPER_ADMIN")

    original = views_users.ensure_governance_remains

    def slow_check(**kwargs):
        original(**kwargs)
        time.sleep(0.4)

    monkeypatch.setattr(views_users, "ensure_governance_remains", slow_check)

    barrier = threading.Barrier(2)
    results = {}

    def deactivate(actor, target):
        try:
            client = client_for(actor)
            client.raise_request_exception = False
            barrier.wait()
            results[actor.email] = client.post(f"/api/v1/users/{target.pk}/deactivate").status_code
        finally:
            connection.close()

    threads = [threading.Thread(target=deactivate, args=(a, b)), threading.Thread(target=deactivate, args=(b, a))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    # Exactly one wins. The loser is refused: 409 from the invariant, surfaced as 400
    # "session interrupted" because the winner's deactivation also ended the loser's session.
    codes = list(results.values())
    assert len(codes) == 2 and codes.count(200) == 1, results
    loser = next(c for c in codes if c != 200)
    assert loser in (400, 409), results
    assert User.objects.filter(status="active", email__startswith="race-").count() == 1
    assert governance_holders_after() == 1


# --- R7a: organisation-wide (global_only) roles — FACULTY_ADVISOR ---------------------------------------


def _fa(actor, org, **extra):
    return assign(actor, {"user_id": str(org["member_a"].pk), "role": "FACULTY_ADVISOR", "scope_type": "GLOBAL", **extra})


def test_faculty_advisor_vertical_assignment_is_rejected(org):
    r = assign(
        org["super_admin"],
        {
            "user_id": str(org["member_a"].pk),
            "role": "FACULTY_ADVISOR",
            "scope_type": "VERTICAL",
            "scope_id": str(org["vertical_a"].pk),
        },
    )
    assert r.status_code == 400 and "scope_type" in r.json()["error"]["fields"]
    assert not RoleAssignment.objects.filter(role__key="FACULTY_ADVISOR").exists()


@pytest.mark.parametrize("scope_type", ["EVENT", "PROJECT"])
def test_faculty_advisor_other_non_global_scopes_are_rejected(org, scope_type):
    import uuid

    r = assign(
        org["super_admin"],
        {"user_id": str(org["member_a"].pk), "role": "FACULTY_ADVISOR", "scope_type": scope_type, "scope_id": str(uuid.uuid4())},
    )
    assert r.status_code == 400
    assert not RoleAssignment.objects.filter(role__key="FACULTY_ADVISOR").exists()


def test_faculty_advisor_global_assignment_is_accepted(org):
    r = _fa(org["super_admin"], org)
    assert r.status_code == 201, r.content


def test_faculty_advisor_global_with_academic_year_is_accepted(org):
    r = _fa(org["super_admin"], org, academic_year_id=str(org["year"].pk))
    assert r.status_code == 201, r.content
    assert RoleAssignment.objects.get(pk=r.json()["id"]).academic_year_id == org["year"].pk


def test_faculty_advisor_global_with_end_date_is_accepted(org):
    r = _fa(org["super_admin"], org, ends_at=(timezone.now() + timedelta(days=180)).isoformat())
    assert r.status_code == 201, r.content
    assert RoleAssignment.objects.get(pk=r.json()["id"]).ends_at is not None


def test_faculty_advisor_global_with_academic_year_and_end_date_is_accepted(org):
    r = _fa(
        org["super_admin"], org, academic_year_id=str(org["year"].pk), ends_at=(timezone.now() + timedelta(days=180)).isoformat()
    )
    assert r.status_code == 201, r.content


@pytest.mark.parametrize(
    "extra",
    [
        {"scope_type": "VERTICAL", "scope_id": "vertical_a"},
        {"scope_type": "GLOBAL", "academic_year_id": "year"},
        {"scope_type": "GLOBAL", "ends_at": "future"},
    ],
    ids=["vertical", "academic_year", "end_date"],
)
def test_platform_admin_is_unchanged_by_r7_and_r7a(org, extra):
    body = {"user_id": str(org["member_a"].pk), "role": "PLATFORM_ADMIN", **extra}
    if body.get("scope_id") == "vertical_a":
        body["scope_id"] = str(org["vertical_a"].pk)
    if body.get("academic_year_id") == "year":
        body["academic_year_id"] = str(org["year"].pk)
    if body.get("ends_at") == "future":
        body["ends_at"] = (timezone.now() + timedelta(days=30)).isoformat()
    r = assign(org["super_admin"], body)
    assert r.status_code == 201, r.content


def test_r7a_does_not_leak_to_unauthorised_actors(org):
    """Callers who may not grant FACULTY_ADVISOR get 403 — never the 400 describing R7a."""
    bad = {
        "user_id": str(org["member_a"].pk),
        "role": "FACULTY_ADVISOR",
        "scope_type": "VERTICAL",
        "scope_id": str(org["vertical_a"].pk),
    }
    for actor in ["admin_head", "tech_head", "head_a", "member_a"]:
        assert assign(org[actor], bad).status_code == 403, actor
    assert not RoleAssignment.objects.filter(role__key="FACULTY_ADVISOR").exists()


def test_faculty_advisor_duplicate_is_still_a_conflict(org):
    assert _fa(org["super_admin"], org).status_code == 201
    assert _fa(org["super_admin"], org).status_code == 409


def test_permission_catalogue_unchanged():
    """R7a added a scope flag only. Role permissions, own-only flags, privileged flags and assign permissions
    are byte-for-byte what they were before (hashes taken from the catalogue before the change)."""
    import hashlib
    import json

    from apps.rbac.catalogue import PERMISSIONS, SYSTEM_ROLES

    snap = {
        k: {
            "perms": sorted(v["permissions"]),
            "own": sorted(v["own_only"]),
            "priv": v["is_privileged"],
            "assign": v.get("assign_permission", "role.assign"),
        }
        for k, v in SYSTEM_ROLES.items()
    }
    assert (len(PERMISSIONS), len(SYSTEM_ROLES)) == (46, 7)
    assert (
        hashlib.sha256(json.dumps(snap, sort_keys=True).encode()).hexdigest()
        == "2b75042f762e8c60ecc3a6b0ef35a65a8bcd9d2ba032eba01e39a2a8be619d5c"
    )
    assert (
        hashlib.sha256(json.dumps(sorted(PERMISSIONS.items())).encode()).hexdigest()
        == "7ac51ad7c19f4f10c5c9ef032db821e5e0ee91e7d164ee6273a5347e54d41e67"
    )
    assert [k for k, v in SYSTEM_ROLES.items() if v.get("global_only")] == ["FACULTY_ADVISOR"]
    assert [k for k, v in SYSTEM_ROLES.items() if v["is_privileged"]] == ["SUPER_ADMIN", "ADMIN_HEAD", "TECHNICAL_HEAD"]


def test_seeded_roles_carry_the_flags(db):
    from apps.rbac.models import Role

    assert list(Role.objects.filter(global_only=True).values_list("key", flat=True)) == ["FACULTY_ADVISOR"]
    assert sorted(Role.objects.filter(is_privileged=True).values_list("key", flat=True)) == [
        "ADMIN_HEAD",
        "SUPER_ADMIN",
        "TECHNICAL_HEAD",
    ]
