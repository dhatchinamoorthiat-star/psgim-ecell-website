"""Phase B (B3): public event detail — published-only, no existence disclosure."""

import pytest
from rest_framework.test import APIClient

from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.models import ContentBlockType, ContentItem
from conftest import client_for

pytestmark = pytest.mark.django_db
ADMIN = "/api/v1/content/events"
PUBLIC = "/api/v1/content/public/events"
SECRET = "Confidential Draft Title"


@pytest.fixture(autouse=True)
def _block_types(db):
    for spec in BLOCK_TYPES:
        ContentBlockType.objects.create(
            key=spec["key"], label=spec["label"], json_schema=spec["json_schema"],
            allowed_parent_keys=spec["allowed_parent_keys"],
        )  # fmt: skip


@pytest.fixture
def events(org):
    """live (published), draft-only, unpublished (was live), archived."""
    author, approver = client_for(org["super_admin"]), client_for(org["super_admin_2"])

    def make(slug, title):
        r = author.post(ADMIN, {"slug": slug, "detail": {"title": title, "starts_at": "2000-01-01T10:00:00Z"}}, format="json")
        assert r.status_code == 201, r.content

    def publish(slug):
        assert author.post(f"{ADMIN}/{slug}/submit", {}, format="json").status_code == 200
        vid = ContentItem.objects.get(slug=slug).draft_version_id
        assert approver.post(f"/api/v1/content/versions/{vid}/review", {}, format="json").status_code == 200
        assert approver.post(f"/api/v1/content/versions/{vid}/approve", {}, format="json").status_code == 200
        assert author.post(f"{ADMIN}/{slug}/publish", {}, format="json").status_code == 200

    make("live", "Live Event")
    publish("live")
    make("draft-only", SECRET)
    make("was-live", SECRET)
    publish("was-live")
    assert author.post(f"{ADMIN}/was-live/unpublish", {}, format="json").status_code == 200
    make("archived", SECRET)
    publish("archived")
    assert author.delete(f"{ADMIN}/archived").status_code == 200
    # a pending edit on the live event must not leak either
    assert author.patch(f"{ADMIN}/live", {"detail": {"title": SECRET}}, format="json").status_code == 200
    return author


def test_published_event_is_served_with_its_live_fields(events):
    r = APIClient().get(f"{PUBLIC}/live")
    assert r.status_code == 200
    assert r.json()["slug"] == "live" and r.json()["title"] == "Live Event"
    assert r["Cache-Control"] == "no-store" and not r.cookies


@pytest.mark.parametrize("slug", ["draft-only", "was-live", "archived", "never-existed"])
def test_every_non_public_state_gets_the_identical_404(events, slug):
    reference = APIClient().get(f"{PUBLIC}/never-existed")
    r = APIClient().get(f"{PUBLIC}/{slug}")
    assert r.status_code == 404
    assert r.content == reference.content
    assert SECRET.encode() not in r.content


def test_signed_in_staff_get_no_extra_access_through_the_public_endpoint(events):
    assert events.get(f"{PUBLIC}/draft-only").status_code == 404


def test_no_draft_text_on_any_public_surface(events):
    anon = APIClient()
    surfaces = [
        f"{PUBLIC}/live",
        "/api/v1/content/public/dynamic/published_events_past",
        "/api/v1/content/public/dynamic/published_events_upcoming",
        "/api/v1/content/public/event/live",
        "/api/v1/content/public/event/draft-only",
        "/api/v1/content/public/event/was-live",
    ]
    for path in surfaces:
        assert SECRET.encode() not in anon.get(path).content, path
    listed = {r["slug"] for r in anon.get("/api/v1/content/public/dynamic/published_events_past").json()["results"]}
    assert listed == {"live"}


def test_public_endpoint_rejects_writes(events):
    for method in ("post", "put", "patch", "delete"):
        assert getattr(APIClient(), method)(f"{PUBLIC}/live").status_code == 405
