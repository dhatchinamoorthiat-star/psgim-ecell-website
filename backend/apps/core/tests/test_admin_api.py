"""Happy paths of the Phase 1 admin API, and their audit trail."""

import pytest
from django.core import mail

from apps.audit.models import AuditLog
from apps.memberships.models import AcademicYear, Membership
from apps.rbac.models import RoleAssignment
from conftest import client_for

pytestmark = pytest.mark.django_db


def audited(action, actor, result="SUCCESS"):
    return AuditLog.objects.filter(action=action, actor=actor, result=result).exists()


def test_vertical_lifecycle(org):
    sa = org["super_admin"]
    c = client_for(sa)
    r = c.post("/api/v1/verticals", {"slug": "test-new", "name": "Test New", "description": "d"})
    assert r.status_code == 201, r.content
    vid = r.json()["id"]
    dup = c.post("/api/v1/verticals", {"slug": "test-new", "name": "Dup"})
    assert dup.status_code == 400 and "slug" in dup.json()["error"]["fields"]
    r = c.patch(f"/api/v1/verticals/{vid}", {"name": "Renamed", "description": "new"})
    assert r.json()["name"] == "Renamed" and r.json()["slug"] == "test-new"
    assert c.post(f"/api/v1/verticals/{vid}/archive", {"confirm": "wrong"}).status_code == 400
    r = c.post(f"/api/v1/verticals/{vid}/archive", {"confirm": "test-new"})
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert all(v["id"] != vid for v in c.get("/api/v1/verticals").json()["results"])
    assert any(v["id"] == vid for v in c.get("/api/v1/verticals?include_archived=true").json()["results"])
    for action in ["vertical.create", "vertical.update", "vertical.archive"]:
        assert audited(action, sa)
    row = AuditLog.objects.get(action="vertical.update")
    assert row.before["name"] == "Test New" and row.after["name"] == "Renamed"
    assert row.actor_grants and row.actor_grants[0]["role"] == "SUPER_ADMIN"


def test_archiving_vertical_with_live_roles_is_refused(org):
    r = client_for(org["super_admin"]).post(f"/api/v1/verticals/{org['vertical_a'].pk}/archive", {"confirm": "test-vertical-a"})
    assert r.status_code == 409


def test_vertical_head_sees_only_own_vertical(org):
    slugs = [v["slug"] for v in client_for(org["head_a"]).get("/api/v1/verticals").json()["results"]]
    assert slugs == ["test-vertical-a"]


def test_academic_year_switch(org):
    c = client_for(org["super_admin"])
    r = c.post("/api/v1/academic-years", {"label": "2099-00", "starts_on": "2099-07-01", "ends_on": "2100-06-30"})
    assert r.status_code == 201
    new_id = r.json()["id"]
    assert c.post(f"/api/v1/academic-years/{new_id}/make-current").status_code == 200
    assert AcademicYear.objects.get(is_current=True).label == "2099-00"
    # Year-bound memberships of the old year no longer place people in scopes.
    assert org["member_a"].rbac_scopes() == set()
    assert c.post(f"/api/v1/academic-years/{new_id}/make-current").status_code == 409


def test_membership_add_and_end_keeps_history(org):
    c = client_for(org["head_a"])
    r = c.post(
        "/api/v1/memberships", {"user_id": str(org["outsider"].pk), "vertical_id": str(org["vertical_a"].pk), "title": "Member"}
    )
    assert r.status_code == 201
    mid = r.json()["id"]
    assert (
        c.post("/api/v1/memberships", {"user_id": str(org["outsider"].pk), "vertical_id": str(org["vertical_a"].pk)}).status_code
        == 409
    )
    r = c.post(f"/api/v1/memberships/{mid}/end")
    assert r.status_code == 200 and r.json()["status"] == "ended" and r.json()["left_at"]
    assert Membership.objects.filter(pk=mid).exists()  # never deleted
    assert audited("membership.create", org["head_a"]) and audited("membership.end", org["head_a"])


def test_user_create_sends_invite_and_deactivate_reactivate(org):
    c = client_for(org["admin_head"])
    r = c.post("/api/v1/users", {"email": "New.Person@Test.Example", "full_name": "New Person"})
    assert r.status_code == 201
    assert r.json()["email"] == "new.person@test.example"
    assert mail.outbox and "reset-password?uid=" in mail.outbox[-1].body
    uid = r.json()["id"]
    assert c.post("/api/v1/users", {"email": "new.person@test.example", "full_name": "Dup"}).status_code == 400
    assert c.patch(f"/api/v1/users/{uid}", {"full_name": "Renamed Person"}).json()["full_name"] == "Renamed Person"
    assert c.post(f"/api/v1/users/{uid}/deactivate").json()["status"] == "inactive"
    assert c.post(f"/api/v1/users/{uid}/deactivate").status_code == 409
    assert c.post(f"/api/v1/users/{uid}/reactivate").json()["status"] == "active"
    for action in ["user.create", "user.update", "user.deactivate", "user.reactivate"]:
        assert audited(action, org["admin_head"])


def test_assign_and_revoke_vertical_head(org):
    c = client_for(org["admin_head"])
    r = c.post(
        "/api/v1/role-assignments",
        {
            "user_id": str(org["member_b"].pk),
            "role": "VERTICAL_HEAD",
            "scope_type": "VERTICAL",
            "scope_id": str(org["vertical_b"].pk),
        },
    )
    assert r.status_code == 201, r.content
    aid = r.json()["id"]
    assert c.post(f"/api/v1/role-assignments/{aid}/revoke", {"reason": "handover"}).status_code == 200
    assert RoleAssignment.objects.get(pk=aid).revoked_at is not None  # kept, not deleted
    assert c.post(f"/api/v1/role-assignments/{aid}/revoke", {}).status_code == 409
    assert audited("role.assign", org["admin_head"]) and audited("role.revoke", org["admin_head"])


def test_assignment_list_is_scoped(org):
    rows = client_for(org["head_a"]).get("/api/v1/role-assignments").json()["results"]
    assert rows and all(r["scope_id"] == str(org["vertical_a"].pk) for r in rows)


def test_settings_update_validates_timezone(org):
    c = client_for(org["tech_head"])
    assert c.patch("/api/v1/settings", {"timezone": "Mars/Olympus"}).status_code == 400
    r = c.patch("/api/v1/settings", {"timezone": "Asia/Kolkata", "name": "PSGIM E-Cell"})
    assert r.status_code == 200
    assert audited("system.settings_update", org["tech_head"])


def test_audit_log_filters(org):
    client_for(org["head_a"]).post("/api/v1/verticals", {"slug": "nope", "name": "Nope"})
    c = client_for(org["super_admin"])
    rows = c.get("/api/v1/audit?result=DENIED&action=vertical").json()["results"]
    assert rows and rows[0]["actor_email"] == "head_a@test.example"
    assert c.get("/api/v1/audit?since=not-a-date").status_code == 400


def test_roles_endpoint_lists_permissions(org):
    roles = {r["key"]: r for r in client_for(org["admin_head"]).get("/api/v1/roles").json()}
    assert roles["VERTICAL_HEAD"]["assign_permission"] == "vertical_head.assign"
    member_perms = {p["code"]: p["own_only"] for p in roles["MEMBER"]["permissions"]}
    assert member_perms["blog.edit"] is True and member_perms["kb.view"] is False


def test_errors_use_contract_shape(org):
    r = client_for(org["super_admin"]).post("/api/v1/verticals", {"name": ""})
    body = r.json()
    assert r.status_code == 400
    assert body["error"]["code"] == "validation_error" and "slug" in body["error"]["fields"]


def test_failed_audit_write_rolls_back_the_change(org, monkeypatch):
    """A change must never commit without its audit row (docs/09): if recording fails, the mutation is undone."""
    from apps.verticals import views as vertical_views

    def broken_record(*args, **kwargs):
        raise RuntimeError("audit storage unavailable")

    monkeypatch.setattr(vertical_views.audit, "record", broken_record)
    c = client_for(org["super_admin"])
    c.raise_request_exception = False
    r = c.patch(f"/api/v1/verticals/{org['vertical_a'].pk}", {"name": "Changed"})
    assert r.status_code == 500
    org["vertical_a"].refresh_from_db()
    assert org["vertical_a"].name == "Test Vertical A"
    assert not AuditLog.objects.filter(action="vertical.update").exists()


def test_refused_mutation_leaves_no_success_row(org):
    r = client_for(org["super_admin"]).post(f"/api/v1/verticals/{org['vertical_a'].pk}/archive", {"confirm": "test-vertical-a"})
    assert r.status_code == 409
    assert not AuditLog.objects.filter(action="vertical.archive", result="SUCCESS").exists()
