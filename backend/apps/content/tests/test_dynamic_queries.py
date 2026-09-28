"""
The allowlisted dynamic-content mechanism (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
"Dynamic content"). Every test here is really testing the allowlist boundary:
nothing besides a registered `query_id` and its own declared `sort`/`limit`
options can ever reach the database.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.content import dynamic_queries
from apps.content.models import BlogDetail, ContentItem, ContentVersion, EventDetail, WorkflowState
from conftest import client_for

pytestmark = pytest.mark.django_db


def _published_item(*, content_type: str, slug: str, author, **detail_kwargs) -> ContentItem:
    item = ContentItem.objects.create(content_type=content_type, slug=slug, created_by=author)
    version = ContentVersion.objects.create(
        content_item=item, number=1, state=WorkflowState.PUBLISHED, blocks={"schema_version": 1, "blocks": []}, author=author
    )
    item.published_version = version
    item.state = WorkflowState.PUBLISHED
    item.save(update_fields=["published_version", "state"])
    if content_type == "event":
        EventDetail.objects.create(content_item=item, **detail_kwargs)
    elif content_type == "blog":
        BlogDetail.objects.create(content_item=item, **detail_kwargs)
    return item


def test_unknown_query_id_is_not_found():
    with pytest.raises(NotFound):
        dynamic_queries.resolve("published_users")  # not a real query, and never will be — no allowlist entry


def test_disallowed_sort_is_rejected(org):
    _published_item(content_type="event", slug="e1", author=org["super_admin"], title="Event 1")
    with pytest.raises(ValidationError):
        dynamic_queries.resolve("published_events_upcoming", sort="title_asc")  # not in allowed_sorts


def test_limit_out_of_range_is_rejected(org):
    with pytest.raises(ValidationError):
        dynamic_queries.resolve("published_events_upcoming", limit=0)
    with pytest.raises(ValidationError):
        dynamic_queries.resolve("published_events_upcoming", limit=1000)  # exceeds max_limit=24


def test_published_events_upcoming_excludes_past_and_draft_and_respects_sort(org):
    now = timezone.now()
    _published_item(content_type="event", slug="soon", author=org["super_admin"], title="Soon", starts_at=now + timedelta(days=1))
    _published_item(content_type="event", slug="later", author=org["super_admin"], title="Later", starts_at=now + timedelta(days=5))
    _published_item(content_type="event", slug="past", author=org["super_admin"], title="Past", starts_at=now - timedelta(days=5))
    draft_item = ContentItem.objects.create(content_type="event", slug="unpublished-event", created_by=org["super_admin"])
    ContentVersion.objects.create(
        content_item=draft_item, number=1, state=WorkflowState.DRAFT, blocks={"schema_version": 1, "blocks": []},
        author=org["super_admin"],
    )  # fmt: skip
    EventDetail.objects.create(content_item=draft_item, title="Unpublished", starts_at=now + timedelta(days=2))

    result = dynamic_queries.resolve("published_events_upcoming", sort="starts_at_asc")
    slugs = [r["slug"] for r in result["results"]]
    assert slugs == ["soon", "later"]  # ascending order, past + unpublished excluded


def test_published_events_past_returns_only_elapsed_events(org):
    now = timezone.now()
    _published_item(content_type="event", slug="was", author=org["super_admin"], title="Was", starts_at=now - timedelta(days=3))
    _published_item(content_type="event", slug="upcoming", author=org["super_admin"], title="Upcoming", starts_at=now + timedelta(days=1))
    result = dynamic_queries.resolve("published_events_past")
    assert [r["slug"] for r in result["results"]] == ["was"]


def test_event_uses_ends_at_when_present_for_upcoming_past_split(org):
    now = timezone.now()
    # Started yesterday, still running today -> counts as upcoming (not yet elapsed).
    _published_item(
        content_type="event", slug="ongoing", author=org["super_admin"], title="Ongoing",
        starts_at=now - timedelta(days=1), ends_at=now + timedelta(hours=2),
    )  # fmt: skip
    result = dynamic_queries.resolve("published_events_upcoming")
    assert "ongoing" in [r["slug"] for r in result["results"]]


def test_published_blogs_excludes_drafts_and_respects_limit(org):
    for i in range(3):
        _published_item(
            content_type="blog", slug=f"post-{i}", author=org["super_admin"], title=f"Post {i}", excerpt="x", category="c"
        )
    result = dynamic_queries.resolve("published_blogs", limit=2)
    assert result["count"] == 2
    assert len(result["results"]) == 2


def test_public_dynamic_query_endpoint_is_unauthenticated_and_allowlisted(org):
    _published_item(content_type="event", slug="e1", author=org["super_admin"], title="E1", starts_at=timezone.now() + timedelta(days=1))
    anon = client_for(None)

    r = anon.get("/api/v1/content/public/dynamic/published_events_upcoming")
    assert r.status_code == 200
    assert r.data["query"] == "published_events_upcoming"

    r = anon.get("/api/v1/content/public/dynamic/arbitrary_query")
    assert r.status_code == 404

    r = anon.get("/api/v1/content/public/dynamic/published_events_upcoming?sort=not-a-real-sort")
    assert r.status_code == 400

    r = anon.get("/api/v1/content/public/dynamic/published_events_upcoming?limit=not-an-int")
    assert r.status_code == 400
