"""
Privilege-escalation tests (docs/18_TESTING_STRATEGY.md, "Escalation tests").

These call the API exactly as an attacker would — a signed-in user sending
requests by hand — and assert both the HTTP status and, for refused
mutations, a DENIED audit row.
"""

import pytest

from apps.audit.models import AuditLog
from apps.rbac.models import RoleAssignment
from conftest import client_for

pytestmark = pytest.mark.django_db


def denied_rows(actor, action: str | None = None):
    qs = AuditLog.objects.filter(actor=actor, result=AuditLog.Result.DENIED)
    return qs.filter(action=action) if action else qs


# --- 1. An ordinary vertical head cannot reach governance endpoints ------------------------

GOVERNANCE_MUTATIONS = [
    # (method, url-builder, body-builder, permission that should be named in the DENIED row)
    ("post", lambda o: "/api/v1/role-assignments", lambda o: {"user_id": str(o["member_b"].pk), "role": "MEMBER", "scope_type": "GLOBAL"}, "role.assign"),
    ("post", lambda o: "/api/v1/verticals", lambda o: {"slug": "rogue", "name": "Rogue"}, "vertical.manage"),
    ("patch", lambda o: f"/api/v1/verticals/{o['vertical_a'].pk}", lambda o: {"name": "Renamed"}, "vertical.manage"),
    ("post", lambda o: f"/api/v1/verticals/{o['vertical_a'].pk}/archive", lambda o: {"confirm": "test-vertical-a"}, "vertical.manage"),
    ("patch", lambda o: "/api/v1/settings", lambda o: {"timezone": "UTC"}, "system.settings"),
    ("post", lambda o: "/api/v1/users", lambda o: {"email": "new@test.example", "full_name": "New"}, "user.manage"),
    ("post", lambda o: "/api/v1/academic-years", lambda o: {"label": "2199-00", "starts_on": "2199-07-01", "ends_on": "2200-06-30"}, "academic_year.manage"),
]  # fmt: skip


@pytest.mark.parametrize("actor", ["head_a", "member_a", "outsider"])
@pytest.mark.parametrize(("method", "url", "body", "perm"), GOVERNANCE_MUTATIONS)
def test_non_governors_cannot_mutate_governance(org, actor, method, url, body, perm):
    client = client_for(org[actor])
    response = getattr(client, method)(url(org), body(org), format="json")
    assert response.status_code == 403, response.content
    assert denied_rows(org[actor], perm).exists(), "refused mutation must leave a DENIED audit row"


@pytest.mark.parametrize("actor", ["head_a", "member_a", "admin_head", "outsider"])
@pytest.mark.parametrize("url", ["/api/v1/audit", "/api/v1/settings"])
def test_non_governors_cannot_read_governance(org, actor, url):
    response = client_for(org[actor]).get(url)
    assert response.status_code == 403


def test_admin_head_cannot_read_permission_catalogue(org):
    assert client_for(org["admin_head"]).get("/api/v1/permissions").status_code == 403


def test_technical_head_reads_audit_and_settings_but_cannot_govern(org):
    tech = client_for(org["tech_head"])
    assert tech.get("/api/v1/audit").status_code == 200
    assert tech.get("/api/v1/settings").status_code == 200
    # Platform authority is not organisational sovereignty (principle 1).
    assert tech.post("/api/v1/verticals", {"slug": "x", "name": "X"}).status_code == 403
    r = tech.post(
        "/api/v1/role-assignments",
        {"user_id": str(org["member_a"].pk), "role": "MEMBER", "scope_type": "VERTICAL", "scope_id": str(org["vertical_a"].pk)},
    )
    assert r.status_code == 403


# --- 2. A vertical head cannot grant themselves (or anyone) more power -----------------------


@pytest.mark.parametrize(
    ("role", "scope_type", "scope"),
    [
        ("SUPER_ADMIN", "GLOBAL", None),
        ("ADMIN_HEAD", "GLOBAL", None),
        ("VERTICAL_HEAD", "GLOBAL", None),
        ("MEMBER", "GLOBAL", None),
        ("VERTICAL_HEAD", "VERTICAL", "vertical_b"),
        ("VERTICAL_HEAD", "VERTICAL", "vertical_a"),
    ],
)
@pytest.mark.parametrize("target", ["head_a", "member_a"])
def test_vertical_head_cannot_grant_roles(org, role, scope_type, scope, target):
    body = {"user_id": str(org[target].pk), "role": role, "scope_type": scope_type}
    if scope:
        body["scope_id"] = str(org[scope].pk)
    before = RoleAssignment.objects.count()
    response = client_for(org["head_a"]).post("/api/v1/role-assignments", body)
    assert response.status_code == 403
    assert RoleAssignment.objects.count() == before
    assert denied_rows(org["head_a"]).exists()


# --- 3. Admin Head cannot mint privileged roles ------------------------------------------------


@pytest.mark.parametrize("role", ["SUPER_ADMIN", "ADMIN_HEAD", "TECHNICAL_HEAD"])
def test_admin_head_cannot_grant_privileged_roles(org, role):
    r = client_for(org["admin_head"]).post(
        "/api/v1/role-assignments", {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "GLOBAL"}
    )
    assert r.status_code == 403
    assert denied_rows(org["admin_head"], "role.assign").exists()
    assert not RoleAssignment.objects.filter(user=org["member_a"], role__key=role).exists()


@pytest.mark.parametrize("role", ["PLATFORM_ADMIN", "FACULTY_ADVISOR"])
def test_admin_head_cannot_grant_permissions_they_lack(org, role):
    # PLATFORM_ADMIN carries system.settings; FACULTY_ADVISOR carries content.approve_faculty.
    r = client_for(org["admin_head"]).post(
        "/api/v1/role-assignments", {"user_id": str(org["member_a"].pk), "role": role, "scope_type": "GLOBAL"}
    )
    assert r.status_code == 403


def test_admin_head_can_assign_vertical_head_and_member(org):
    client = client_for(org["admin_head"])
    for role in ["VERTICAL_HEAD", "MEMBER"]:
        r = client.post(
            "/api/v1/role-assignments",
            {"user_id": str(org["member_b"].pk), "role": role, "scope_type": "VERTICAL", "scope_id": str(org["vertical_b"].pk)},
        )
        assert r.status_code in (201, 409), r.content  # MEMBER @ B already exists -> 409
    assert AuditLog.objects.filter(actor=org["admin_head"], action="role.assign", result="SUCCESS").exists()


def test_admin_head_cannot_revoke_super_admin(org):
    sa = RoleAssignment.objects.get(user=org["super_admin_2"], role__key="SUPER_ADMIN")
    r = client_for(org["admin_head"]).post(f"/api/v1/role-assignments/{sa.pk}/revoke", {})
    assert r.status_code == 403
    sa.refresh_from_db()
    assert sa.revoked_at is None


def test_admin_head_cannot_deactivate_super_admin(org):
    r = client_for(org["admin_head"]).post(f"/api/v1/users/{org['super_admin'].pk}/deactivate")
    assert r.status_code == 403
    org["super_admin"].refresh_from_db()
    assert org["super_admin"].is_active


# --- 4. Nobody edits their own assignments ------------------------------------------------------


def test_super_admin_cannot_grant_self(org):
    r = client_for(org["super_admin"]).post(
        "/api/v1/role-assignments", {"user_id": str(org["super_admin"].pk), "role": "TECHNICAL_HEAD", "scope_type": "GLOBAL"}
    )
    assert r.status_code == 403


def test_nobody_can_deactivate_themselves(org):
    assert client_for(org["admin_head"]).post(f"/api/v1/users/{org['admin_head'].pk}/deactivate").status_code == 403


# --- 5. The last Super Admin cannot be removed --------------------------------------------------


def test_last_super_admin_cannot_be_revoked(org):
    sa1 = RoleAssignment.objects.get(user=org["super_admin"], role__key="SUPER_ADMIN")
    sa2 = RoleAssignment.objects.get(user=org["super_admin_2"], role__key="SUPER_ADMIN")
    # With two, one may remove the other.
    assert client_for(org["super_admin"]).post(f"/api/v1/role-assignments/{sa2.pk}/revoke", {}).status_code == 200
    # Now super_admin is the last one: removing them must be refused with 409, not silently allowed.
    r = client_for(org["super_admin"]).post(f"/api/v1/role-assignments/{sa1.pk}/revoke", {})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"
    sa1.refresh_from_db()
    assert sa1.revoked_at is None


def test_sole_super_admin_cannot_deactivate_themselves(org):
    """Only the last Super Admin could attempt this, and self-changes are refused first (403)."""
    RoleAssignment.objects.filter(user=org["super_admin_2"]).update(revoked_at="2000-01-01T00:00:00Z")
    assert client_for(org["super_admin"]).post(f"/api/v1/users/{org['super_admin'].pk}/deactivate").status_code == 403
    org["super_admin"].refresh_from_db()
    assert org["super_admin"].is_active


def test_super_admin_can_grant_technical_roles(org):
    """ADR-010: role.manage holders are exempt from the subset rule, else nobody could ever appoint a Technical Head."""
    r = client_for(org["super_admin"]).post(
        "/api/v1/role-assignments", {"user_id": str(org["member_a"].pk), "role": "TECHNICAL_HEAD", "scope_type": "GLOBAL"}
    )
    assert r.status_code == 201, r.content


# --- 6. Scope boundaries -------------------------------------------------------------------------


def test_vertical_head_manages_only_own_vertical_members(org):
    head = client_for(org["head_a"])
    ok = head.post("/api/v1/memberships", {"user_id": str(org["outsider"].pk), "vertical_id": str(org["vertical_a"].pk)})
    assert ok.status_code == 201, ok.content
    refused = head.post("/api/v1/memberships", {"user_id": str(org["outsider"].pk), "vertical_id": str(org["vertical_b"].pk)})
    assert refused.status_code == 403
    assert denied_rows(org["head_a"], "membership.manage").exists()


def test_scoped_lists_hide_other_verticals(org):
    body = client_for(org["head_a"]).get("/api/v1/memberships").json()
    verticals = {m["vertical"]["slug"] for m in body["results"]}
    assert verticals == {"test-vertical-a"}
    users = {u["email"] for u in client_for(org["head_a"]).get("/api/v1/users").json()["results"]}
    assert "member_b@test.example" not in users
    assert "member_a@test.example" in users


def test_objects_outside_scope_are_404_not_403(org):
    r = client_for(org["head_a"]).get(f"/api/v1/users/{org['member_b'].pk}")
    assert r.status_code == 404


def test_revoked_role_stops_working_immediately(org):
    admin = org["admin_head"]
    RoleAssignment.objects.filter(user=admin).update(revoked_at="2000-01-01T00:00:00Z")
    assert client_for(admin).get("/api/v1/users").status_code == 403


def test_deactivated_user_loses_session(org):
    victim_client = client_for(org["member_a"])
    assert victim_client.get("/api/v1/auth/me").status_code == 200
    assert client_for(org["super_admin"]).post(f"/api/v1/users/{org['member_a'].pk}/deactivate").status_code == 200
    assert victim_client.get("/api/v1/auth/me").status_code == 401
