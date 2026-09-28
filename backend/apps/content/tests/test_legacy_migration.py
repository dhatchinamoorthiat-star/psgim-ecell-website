"""
Phase 2B migration adapter (docs/22_MIGRATION_MATRIX.md). Verifies the
migration is deterministic, idempotent, and produces schema-valid,
non-lossy structured content — not that it matches the site pixel for
pixel (that's the Angular renderer's job, tested separately).
"""

import io

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.legacy_migration import PAGE_MIGRATIONS, migrate_home
from apps.content.management.commands.migrate_legacy_content import apply_migration
from apps.content.models import ContentBlockType, ContentItem, ContentVersion, WorkflowState
from apps.content.validation import validate_blocks_document
from conftest import make_user

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _block_types(db):
    for spec in BLOCK_TYPES:
        ContentBlockType.objects.create(
            key=spec["key"], label=spec["label"], json_schema=spec["json_schema"],
            allowed_parent_keys=spec["allowed_parent_keys"],
        )  # fmt: skip


def test_migration_is_deterministic():
    a, b = migrate_home(), migrate_home()
    assert a.blocks == b.blocks
    assert a.seo == b.seo


def test_every_page_migration_produces_schema_valid_blocks():
    block_types = {bt.key: bt for bt in ContentBlockType.objects.filter(is_active=True)}
    for migration in PAGE_MIGRATIONS:
        validate_blocks_document({"schema_version": 1, "blocks": migration.blocks}, block_types)  # raises on failure


def test_structured_data_stays_structured_not_flattened():
    """A representative check that migration didn't collapse Stat/TimelineEntry/
    ActionCard-shaped source data into bare strings (the original gate-review defect)."""
    home = migrate_home()
    stats_block = next(b for b in home.blocks if b["type"] == "stats")
    first_stat = stats_block["props"]["items"][0]
    assert set(first_stat) >= {"value", "label", "count"}
    assert first_stat["value"] == "2019" and first_stat["label"] == "Established"

    cards_block = next(b for b in home.blocks if b["id"] == "home-what-happens")
    first_card = cards_block["props"]["cards"][0]
    assert first_card == {"title": "Build", "body": "Turn an idea into something people can actually see, use or question."}


def test_apply_migration_creates_published_item_with_page_detail(db):
    actor = make_user("migrator@test.example")
    item, changed = apply_migration(migrate_home(), actor=actor)
    assert changed is True
    assert item.published_version is not None
    assert item.published_version.state == WorkflowState.PUBLISHED
    assert item.page_detail.title == "Home"
    assert item.versions.count() == 1


def test_rerunning_migration_does_not_duplicate_content(db):
    actor = make_user("migrator2@test.example")
    migration = migrate_home()

    item1, changed1 = apply_migration(migration, actor=actor)
    item2, changed2 = apply_migration(migration, actor=actor)  # rerun, identical source

    assert changed1 is True
    assert changed2 is False
    assert item1.id == item2.id
    assert ContentItem.objects.filter(content_type="page", slug="home").count() == 1
    assert ContentVersion.objects.filter(content_item=item1).count() == 1


def test_command_requires_an_existing_actor(db):
    out = io.StringIO()
    with pytest.raises(CommandError):
        call_command("migrate_legacy_content", "--actor-email=nobody@test.example", stdout=out)
    assert not ContentItem.objects.exists()


def test_command_runs_end_to_end_and_is_idempotent(db):
    actor = make_user("migrator3@test.example")
    total = len(PAGE_MIGRATIONS)
    out = io.StringIO()
    call_command("migrate_legacy_content", f"--actor-email={actor.email}", stdout=out)
    assert f"{total} created, 0 updated, 0 unchanged" in out.getvalue()
    assert ContentItem.objects.count() == total

    out2 = io.StringIO()
    call_command("migrate_legacy_content", f"--actor-email={actor.email}", stdout=out2)
    assert f"0 created, 0 updated, {total} unchanged" in out2.getvalue()
    assert ContentItem.objects.count() == total  # still no duplicates


def test_every_content_type_is_represented_in_the_migrated_set(db):
    types = {m.content_type for m in PAGE_MIGRATIONS}
    assert types == {"page", "nec", "event", "blog"}


def test_pending_content_survives_migration(db):
    """The Pending<T> editorial marker (about.data.ts's vision/timeline) is
    preserved through migration, not silently stripped."""
    about = next(m for m in PAGE_MIGRATIONS if m.slug == "about")
    vision_block = next(b for b in about.blocks if b["id"] == "about-vision")
    assert vision_block["props"]["pending"] is True
    assert vision_block["props"]["pending_label"]

    event_migrations = [m for m in PAGE_MIGRATIONS if m.content_type == "event"]
    assert event_migrations and all(m.detail_fields["pending"] is True for m in event_migrations)


def test_events_migrate_with_full_metadata_for_dynamic_listing(db):
    event_migrations = {m.slug: m for m in PAGE_MIGRATIONS if m.content_type == "event"}
    bootcamp = event_migrations["bootcamp-oct"]
    assert bootcamp.detail_fields["starts_at"] is not None
    assert bootcamp.detail_fields["ends_at"] is not None
    assert bootcamp.detail_fields["time_label"] == "Fri – Sun"
    assert bootcamp.detail_fields["registration_status"] == "open"


def test_blogs_migrate_with_author_name_not_a_fabricated_user(db):
    blog_migrations = [m for m in PAGE_MIGRATIONS if m.content_type == "blog"]
    assert blog_migrations
    assert blog_migrations[0].detail_fields["author_name"] == "E-Cell writing team"
