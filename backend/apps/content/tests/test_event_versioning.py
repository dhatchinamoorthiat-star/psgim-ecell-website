"""Phase B (B1): versioned event details, projection on publish, service-boundary permissions."""

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIRequestFactory

from apps.content import dynamic_queries, workflow
from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.event_detail import validate_editor_input
from apps.content.models import ContentBlockType, ContentItem, ContentVersion, EventDetail, WorkflowState
from apps.core.exceptions import Conflict

BLOCKS = {"schema_version": 1, "blocks": []}


@pytest.fixture
def block_types(db):
    for spec in BLOCK_TYPES:
        ContentBlockType.objects.create(
            key=spec["key"], label=spec["label"], json_schema=spec["json_schema"],
            allowed_parent_keys=spec["allowed_parent_keys"],
        )  # fmt: skip


def req(user):
    r = APIRequestFactory().post("/")
    r.user = user
    return r


def detail(title="Founders Night", **extra):
    return validate_editor_input({"title": title, "starts_at": "2099-03-01T12:30:00Z", "venue": "Hall A", **extra})


def new_event(author, *, vertical=None, slug="founders-night", **fields):
    item = ContentItem.objects.create(content_type="event", slug=slug, owner_vertical=vertical, created_by=author)
    version = workflow.create_draft(req(author), content_item=item, blocks=BLOCKS, detail=detail(**fields))
    item.refresh_from_db()
    return item, version


def approve(version, author, approver):
    workflow.submit(req(author), version=version)
    workflow.open_review(req(approver), version=version)
    workflow.approve(req(approver), version=version)
    version.refresh_from_db()
    return version


def public_slugs():
    rows = (
        dynamic_queries.resolve("published_events_upcoming")["results"]
        + dynamic_queries.resolve("published_events_past")["results"]
    )
    return {r["slug"] for r in rows}


# --- projection on publish ---------------------------------------------------


def test_publishing_projects_the_approved_version_into_event_detail(org, block_types):
    item, v1 = new_event(org["super_admin"])
    assert not EventDetail.objects.filter(content_item=item).exists()  # nothing live yet
    approve(v1, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["super_admin_2"]), version=v1)

    projection = EventDetail.objects.get(content_item=item)
    assert projection.title == "Founders Night" and projection.venue == "Hall A"
    assert projection.starts_at.isoformat() == "2099-03-01T12:30:00+00:00"
    assert projection.source == "manual" and projection.pending is False
    assert public_slugs() == {"founders-night"}


def test_editing_a_draft_never_changes_the_live_event(org, block_types):
    item, v1 = new_event(org["super_admin"])
    approve(v1, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["super_admin_2"]), version=v1)

    v2 = workflow.create_draft(req(org["super_admin"]), content_item=item, blocks=BLOCKS)
    assert v2.detail["title"] == "Founders Night"  # inherited from the live version
    workflow.update_draft(req(org["super_admin"]), version=v2, blocks=BLOCKS, detail=detail("SECRET DRAFT TITLE"))

    assert EventDetail.objects.get(content_item=item).title == "Founders Night"
    rows = dynamic_queries.resolve("published_events_upcoming")["results"]
    assert "SECRET DRAFT TITLE" not in str(rows)

    approve(v2, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["super_admin_2"]), version=v2)
    assert EventDetail.objects.get(content_item=item).title == "SECRET DRAFT TITLE"


def test_publish_cannot_bypass_approval(org, block_types):
    item, v1 = new_event(org["super_admin"])
    with pytest.raises(Conflict):
        workflow.publish(req(org["super_admin"]), version=v1)  # DRAFT
    workflow.submit(req(org["super_admin"]), version=v1)
    with pytest.raises(Conflict):
        workflow.publish(req(org["super_admin"]), version=v1)  # SUBMITTED
    assert not EventDetail.objects.filter(content_item=item).exists()


def test_submit_rejects_incomplete_details_early(org, block_types):
    item = ContentItem.objects.create(content_type="event", slug="no-title", created_by=org["super_admin"])
    v = workflow.create_draft(req(org["super_admin"]), content_item=item, blocks=BLOCKS, detail={})
    with pytest.raises(ValidationError):
        workflow.submit(req(org["super_admin"]), version=v)


def test_unpublish_removes_the_event_from_every_public_list(org, block_types):
    item, v1 = new_event(org["super_admin"])
    approve(v1, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["super_admin_2"]), version=v1)
    item.refresh_from_db()
    workflow.unpublish(req(org["super_admin_2"]), item=item)
    assert public_slugs() == set()


def test_revert_copies_the_source_versions_detail(org, block_types):
    item, v1 = new_event(org["super_admin"])
    approve(v1, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["super_admin_2"]), version=v1)
    v2 = workflow.create_draft(req(org["super_admin"]), content_item=item, blocks=BLOCKS, detail=detail("Renamed"))
    item.refresh_from_db()
    v3 = workflow.revert(req(org["super_admin"]), item=item, source_version=v1)
    assert v3.detail["title"] == "Founders Night"
    assert v2.detail["title"] == "Renamed"
    assert EventDetail.objects.get(content_item=item).title == "Founders Night"  # live unchanged by revert


def test_revert_to_a_pre_versioning_version_falls_back_to_current_detail(org, block_types):
    item, v1 = new_event(org["super_admin"])
    legacy = ContentVersion.objects.create(
        content_item=item, number=99, state=WorkflowState.ARCHIVED, blocks=BLOCKS, author=org["super_admin"], detail={}
    )
    item.refresh_from_db()
    v = workflow.revert(req(org["super_admin"]), item=item, source_version=legacy)
    assert v.detail["title"] == "Founders Night"


def test_scheduling_is_refused_for_events(org, block_types):
    from datetime import timedelta

    from django.utils import timezone

    item, v1 = new_event(org["super_admin"])
    approve(v1, org["super_admin"], org["super_admin_2"])
    with pytest.raises(Conflict, match="not available for events"):
        workflow.schedule(req(org["super_admin_2"]), version=v1, publish_at=timezone.now() + timedelta(days=1))


# --- service-boundary permissions -------------------------------------------


def test_member_without_event_permissions_cannot_draft_events_even_via_the_service(org, block_types):
    item = ContentItem.objects.create(content_type="event", slug="x")
    with pytest.raises(PermissionDenied):
        workflow.create_draft(req(org["member_a"]), content_item=item, blocks=BLOCKS, detail=detail())


def test_publish_needs_event_edit_and_content_publish_at_the_events_scope(org, block_types, vertical_a, vertical_b):
    # head_a holds event.* and content.publish only within vertical A.
    item_b, vb = new_event(org["super_admin"], vertical=vertical_b, slug="in-b")
    approve(vb, org["super_admin"], org["super_admin_2"])
    with pytest.raises(PermissionDenied):
        workflow.publish(req(org["head_a"]), version=vb)
    assert not EventDetail.objects.filter(content_item=item_b).exists()

    item_a, va = new_event(org["super_admin"], vertical=vertical_a, slug="in-a")
    approve(va, org["super_admin"], org["super_admin_2"])
    workflow.publish(req(org["head_a"]), version=va)
    assert EventDetail.objects.filter(content_item=item_a).exists()


def test_tech_head_cannot_publish_events(org, block_types):
    item, v = new_event(org["super_admin"])
    approve(v, org["super_admin"], org["super_admin_2"])
    with pytest.raises(PermissionDenied):
        workflow.publish(req(org["tech_head"]), version=v)


def test_non_event_content_is_unaffected(org, block_types):
    item = ContentItem.objects.create(content_type="page", slug="p", created_by=org["super_admin"])
    v = workflow.create_draft(req(org["super_admin"]), content_item=item, blocks=BLOCKS)
    assert v.detail == {}


# --- migration 0007 against representative data -----------------------------


@pytest.mark.django_db
def test_backfill_migration_preserves_published_data_and_never_overwrites():
    # Runs inside the ordinary test transaction: PostgreSQL DDL is transactional,
    # so rewinding to 0006 and re-applying 0007 is rolled back afterwards. (A
    # transaction=True test would end in a TRUNCATE, which the append-only
    # audit trigger correctly refuses.)
    from django.utils import timezone

    executor = MigrationExecutor(connection)
    executor.migrate([("content", "0006_contentversion_detail")])
    apps = executor.loader.project_state([("content", "0006_contentversion_detail")]).apps
    User = apps.get_model("accounts", "User")
    Item = apps.get_model("content", "ContentItem")
    Version = apps.get_model("content", "ContentVersion")
    Detail = apps.get_model("content", "EventDetail")
    try:
        author = User.objects.create(email="mig@example.org", full_name="M", password="!")
        starts = timezone.now().replace(microsecond=0)

        def event(slug, title):
            item = Item.objects.create(content_type="event", slug=slug, state="PUBLISHED")
            Detail.objects.create(content_item=item, title=title, starts_at=starts, venue="Hall", source="linkedin",
                                  speakers=[{"name": "A"}])  # fmt: skip
            return item

        # 1. plain published event
        a = event("a", "Event A")
        va = Version.objects.create(content_item=a, number=1, state="PUBLISHED", blocks={}, author=author)
        a.published_version = va
        a.save()
        # 2. published + newer draft (blocks-only change)
        b = event("b", "Event B")
        vb1 = Version.objects.create(content_item=b, number=1, state="PUBLISHED", blocks={}, author=author)
        vb2 = Version.objects.create(content_item=b, number=2, state="DRAFT", blocks={"edited": True}, author=author)
        b.published_version, b.draft_version = vb1, vb2
        b.save()
        # 3. reverted history: archived v1, published v2
        c = event("c", "Event C")
        vc1 = Version.objects.create(content_item=c, number=1, state="ARCHIVED", blocks={}, author=author)
        vc2 = Version.objects.create(content_item=c, number=2, state="PUBLISHED", blocks={}, author=author)
        c.published_version = vc2
        c.save()
        # 4. a version that already has detail must not be overwritten
        d = event("d", "Event D")
        vd = Version.objects.create(content_item=d, number=1, state="PUBLISHED", blocks={}, author=author,
                                    detail={"title": "already set"})  # fmt: skip
        d.published_version = vd
        d.save()
        # 5. non-event content is untouched
        p = Item.objects.create(content_type="page", slug="p")
        vp = Version.objects.create(content_item=p, number=1, state="PUBLISHED", blocks={}, author=author)

        executor = MigrationExecutor(connection)
        executor.migrate([("content", "0007_backfill_event_version_detail")])

        def fresh(v):
            return Version.objects.get(pk=v.pk)

        assert fresh(va).detail["title"] == "Event A"
        assert fresh(va).detail["starts_at"] == starts.isoformat()
        assert fresh(va).detail["source"] == "linkedin" and fresh(va).detail["speakers"] == [{"name": "A"}]
        assert fresh(vb1).detail["title"] == "Event B" and fresh(vb2).detail["title"] == "Event B"
        assert fresh(vb2).blocks == {"edited": True}  # draft content untouched
        assert fresh(vc2).detail["title"] == "Event C" and fresh(vc1).detail == {}
        assert fresh(vd).detail == {"title": "already set"}
        assert fresh(vp).detail == {}
        assert Detail.objects.get(content_item=a).title == "Event A"  # projection unchanged

        # idempotent
        executor = MigrationExecutor(connection)
        executor.migrate([("content", "0006_contentversion_detail")])
        executor = MigrationExecutor(connection)
        executor.migrate([("content", "0007_backfill_event_version_detail")])
        assert fresh(vd).detail == {"title": "already set"}
    finally:
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())
