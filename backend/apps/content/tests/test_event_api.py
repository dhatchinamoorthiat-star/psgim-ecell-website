"""Phase B (B2): /api/v1/content/events — authorization, validation, workflow, audit."""

import pytest

from apps.audit.models import AuditLog
from apps.content import dynamic_queries
from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.models import ContentBlockType, ContentItem, ContentVersion, EventDetail, WorkflowState
from conftest import client_for, grant, make_user

pytestmark = pytest.mark.django_db
BASE = "/api/v1/content/events"


@pytest.fixture(autouse=True)
def _block_types(db):
    for spec in BLOCK_TYPES:
        ContentBlockType.objects.create(
            key=spec["key"], label=spec["label"], json_schema=spec["json_schema"],
            allowed_parent_keys=spec["allowed_parent_keys"],
        )  # fmt: skip


def body(slug="demo-day", vertical=None, **detail):
    d = {"slug": slug, "detail": {"title": "Demo Day", "starts_at": "2099-05-01T10:00:00Z", **detail}}
    if vertical is not None:
        d["owner_vertical_id"] = str(vertical.pk)
    return d


def create(client, **kw):
    return client.post(BASE, body(**kw), format="json")


def approve_draft(slug, approver):
    """Submit is done by the caller; review + approval through the existing generic endpoints."""
    item = ContentItem.objects.get(slug=slug)
    vid = item.draft_version_id
    c = client_for(approver)
    assert c.post(f"/api/v1/content/versions/{vid}/review", {}, format="json").status_code == 200
    r = c.post(f"/api/v1/content/versions/{vid}/approve", {}, format="json")
    assert r.status_code == 200, r.content


def public_slugs():
    rows = (
        dynamic_queries.resolve("published_events_upcoming")["results"]
        + dynamic_queries.resolve("published_events_past")["results"]
    )
    return {r["slug"] for r in rows}


# --- authorization matrix ----------------------------------------------------


def test_roles_without_event_permissions_are_refused(org):
    for name in ("member_a", "tech_head", "outsider"):
        c = client_for(org[name])
        assert c.get(BASE).status_code == 403, name
        assert create(c).status_code == 403, name
    assert not ContentItem.objects.exists()


def test_faculty_advisor_can_view_but_not_edit(org):
    adviser = make_user("faculty@test.example")
    grant(adviser, "FACULTY_ADVISOR")
    assert create(client_for(org["super_admin"])).status_code == 201
    c = client_for(adviser)
    assert c.get(f"{BASE}/demo-day").status_code == 200
    assert c.patch(f"{BASE}/demo-day", {"detail": {"title": "x"}}, format="json").status_code == 403
    assert c.post(f"{BASE}/demo-day/publish", {}, format="json").status_code == 403
    assert create(c, slug="other").status_code == 403


def test_vertical_head_is_confined_to_their_vertical(org, vertical_a, vertical_b):
    head = client_for(org["head_a"])
    assert create(head, vertical=vertical_a, slug="in-a").status_code == 201
    assert create(head, vertical=vertical_b, slug="in-b").status_code == 403
    assert create(head, slug="global").status_code == 403  # no GLOBAL event.create

    assert create(client_for(org["super_admin"]), vertical=vertical_b, slug="b-event").status_code == 201
    assert {e["slug"] for e in head.get(BASE).json()["results"]} == {"in-a"}
    # Outside scope answers 404, identical to a nonexistent slug: no existence leak.
    for path in (f"{BASE}/b-event", f"{BASE}/no-such-event"):
        assert head.get(path).status_code == 404
        assert head.patch(path, {"detail": {"title": "x"}}, format="json").status_code == 404
        assert head.post(f"{path}/publish", {}, format="json").status_code == 404
        assert head.delete(path).status_code == 404


def test_writes_require_csrf(org):
    c = client_for(org["super_admin"], enforce_csrf=True)
    r = create(c)  # signed in, but no X-CSRFToken
    assert r.status_code == 403 and "CSRF" in r.json()["error"]["message"]
    assert not ContentItem.objects.exists()
    token = c.get("/api/v1/auth/csrf").json()["csrf_token"]
    assert c.post(BASE, body(), format="json", HTTP_X_CSRFTOKEN=token).status_code == 201


# --- validation and injection ------------------------------------------------


@pytest.mark.parametrize(
    "detail",
    [
        {"registration_link": "javascript:alert(1)"},
        {"registration_link": "http://insecure.example/form"},
        {"linkedin_url": "data:text/html,<script>alert(1)</script>"},
        {"featured_image": "//evil.example/x.png"},
        {"featured_image": "javascript:alert(1)"},
        {"gallery": [{"src": "/ok.jpg"}]},  # alt is required
        {"gallery": [{"src": "http://evil.example/x.jpg", "alt": "x"}]},
        {"ends_at": "2099-04-01T10:00:00Z"},  # before starts_at
        {"pending": True},  # provenance is not writable
        {"source": "linkedin"},
        {"state": "PUBLISHED"},
        {"title": ""},
        {"title": "x" * 201},
    ],
)
def test_unsafe_or_invalid_detail_is_rejected(org, detail):
    r = create(client_for(org["super_admin"]), **detail)
    assert r.status_code == 400, (detail, r.content)
    assert not ContentItem.objects.exists()


@pytest.mark.parametrize("slug", ["Demo-Day", "demo_day", "-demo", "demo--day", "../x", "a b"])
def test_invalid_slugs_are_rejected(org, slug):
    assert create(client_for(org["super_admin"]), slug=slug).status_code in (400, 404)
    assert not ContentItem.objects.exists()


def test_duplicate_slug_conflicts(org):
    c = client_for(org["super_admin"])
    assert create(c).status_code == 201
    assert create(c).status_code == 409
    assert ContentItem.objects.count() == 1


def test_html_is_stored_as_plain_text(org):
    c = client_for(org["super_admin"])
    r = create(c, description="<img src=x onerror=alert(1)>")
    assert r.status_code == 201
    assert r.json()["draft"]["detail"]["description"] == "<img src=x onerror=alert(1)>"  # inert text; never rendered as HTML


# --- workflow ----------------------------------------------------------------


def test_full_lifecycle_and_audit(org):
    author, approver = client_for(org["super_admin"]), org["super_admin_2"]
    r = create(author, venue="Hall A")
    assert r.status_code == 201
    assert r.json()["draft"]["detail"]["source"] == "manual" and r.json()["is_published"] is False
    assert public_slugs() == set()

    assert author.post(f"{BASE}/demo-day/publish", {}, format="json").status_code == 409  # not approved
    assert author.post(f"{BASE}/demo-day/submit", {}, format="json").status_code == 200
    assert author.post(f"{BASE}/demo-day/publish", {}, format="json").status_code == 409  # still in review
    approve_draft("demo-day", approver)

    r = author.post(f"{BASE}/demo-day/publish", {}, format="json")
    assert r.status_code == 200 and r.json()["is_published"] is True
    assert public_slugs() == {"demo-day"}
    assert EventDetail.objects.get(content_item__slug="demo-day").venue == "Hall A"

    assert author.post(f"{BASE}/demo-day/unpublish", {}, format="json").status_code == 200
    assert public_slugs() == set()

    r = author.delete(f"{BASE}/demo-day")
    assert r.status_code == 200 and r.json()["state"] == WorkflowState.ARCHIVED
    assert ContentItem.objects.filter(slug="demo-day").exists()  # archived, never deleted

    actions = set(AuditLog.objects.values_list("action", flat=True))
    assert {"event.created", "content.version_created", "content.submitted", "content.approved",
            "content.published", "content.unpublished", "event.archived"} <= actions  # fmt: skip


def test_patch_edits_the_draft_and_detects_stale_edits(org):
    c = client_for(org["super_admin"])
    draft = create(c).json()["draft"]
    r = c.patch(
        f"{BASE}/demo-day", {"detail": {"title": "Demo Day 2"}, "expected_updated_at": draft["updated_at"]}, format="json"
    )
    assert r.status_code == 200 and r.json()["draft"]["detail"]["title"] == "Demo Day 2"
    stale = c.patch(
        f"{BASE}/demo-day", {"detail": {"title": "Lost update"}, "expected_updated_at": draft["updated_at"]}, format="json"
    )
    assert stale.status_code == 409
    assert ContentItem.objects.get(slug="demo-day").draft_version.detail["title"] == "Demo Day 2"


def test_editing_while_in_review_starts_a_new_draft_and_leaves_the_reviewed_version_alone(org):
    c = client_for(org["super_admin"])
    create(c)
    c.post(f"{BASE}/demo-day/submit", {}, format="json")
    submitted = ContentItem.objects.get(slug="demo-day").draft_version
    r = c.patch(f"{BASE}/demo-day", {"detail": {"title": "Changed"}}, format="json")
    assert r.status_code == 200
    submitted.refresh_from_db()
    assert submitted.state == WorkflowState.SUBMITTED and submitted.detail["title"] == "Demo Day"
    assert r.json()["draft"]["detail"]["title"] == "Changed" and r.json()["draft"]["state"] == "DRAFT"


def test_patch_preserves_imported_provenance(org):
    c = client_for(org["super_admin"])
    create(c)
    item = ContentItem.objects.get(slug="demo-day")
    v = item.draft_version
    v.detail = {**v.detail, "source": "linkedin", "pending": False}
    v.save()
    r = c.patch(f"{BASE}/demo-day", {"detail": {"title": "Edited"}}, format="json")
    assert r.json()["draft"]["detail"]["source"] == "linkedin"


def test_generic_content_endpoints_cannot_bypass_event_permissions(org, vertical_a):
    """A member holds own-only content.submit; it must not let them author events via /content."""
    c = client_for(org["member_a"])
    r = c.post("/api/v1/content", {"content_type": "event", "slug": "sneaky", "blocks": {"schema_version": 1, "blocks": []},
                                   "owner_vertical_id": str(vertical_a.pk)}, format="json")  # fmt: skip
    assert r.status_code == 403
    assert not ContentVersion.objects.filter(content_item__slug="sneaky").exists()


def test_generic_schedule_endpoint_refuses_events(org):
    c = client_for(org["super_admin"])
    create(c)
    c.post(f"{BASE}/demo-day/submit", {}, format="json")
    approve_draft("demo-day", org["super_admin_2"])
    vid = ContentItem.objects.get(slug="demo-day").draft_version_id
    r = c.post(f"/api/v1/content/versions/{vid}/schedule", {"publish_at": "2099-01-01T00:00:00Z"}, format="json")
    assert r.status_code == 409
    assert "not available for events" in r.content.decode()
