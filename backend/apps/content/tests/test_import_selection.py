"""migrate_legacy_content --only / --exclude-pending / --dry-run (docs/28_A2_DEPLOYMENT_RUNBOOK.md)."""

import io
from dataclasses import replace

import pytest
from django.core.management import CommandError, call_command

from apps.audit.models import AuditLog
from apps.content import dynamic_queries
from apps.content.legacy_migration import PAGE_MIGRATIONS
from apps.content.management.commands.migrate_legacy_content import (
    _block_types_by_key,
    plan_migration,
    select_migrations,
)
from apps.content.models import ContentItem, ContentVersion, EventDetail
from conftest import make_user

CONFIRMED_EVENTS = {
    "un-day-2025",
    "yes-26-business-pitch",
    "sustainability-certifications-tuv-sud",
    "in-between-the-chapters",
    "ipr-awareness-cii",
    "wildcard-ventures",
}


@pytest.fixture
def block_types(db):
    call_command("seed_content_block_types", stdout=io.StringIO())


def run(*args):
    out = io.StringIO()
    call_command("migrate_legacy_content", *args, stdout=out)
    return out.getvalue()


# --- selection (pure) --------------------------------------------------------


def test_events_without_pending_are_exactly_the_six_confirmed_events():
    selected, excluded = select_migrations(PAGE_MIGRATIONS, only={"event"}, exclude_pending=True)
    assert {m.slug for m in selected} == CONFIRMED_EVENTS
    assert not [m for m, _ in excluded if m.content_type == "event"]


def test_institutional_pages_are_the_sixteen_page_and_nec_items():
    selected, _ = select_migrations(PAGE_MIGRATIONS, only={"page", "nec"})
    assert len(selected) == 16
    assert {m.content_type for m in selected} == {"page", "nec"}


def test_exclude_pending_never_drops_pages_with_in_page_editorial_markers():
    selected, _ = select_migrations(PAGE_MIGRATIONS, only={"page", "nec"}, exclude_pending=True)
    assert len(selected) == 16  # e.g. About's "pending sign-off" vision block stays


def test_no_filters_selects_everything_in_source_order():
    selected, excluded = select_migrations(PAGE_MIGRATIONS)
    assert selected == PAGE_MIGRATIONS and excluded == []


# --- command: validation of options ------------------------------------------


def test_unknown_content_type_is_rejected(block_types):
    with pytest.raises(CommandError, match="Unknown content type"):
        run("--dry-run", "--only", "events")


def test_real_run_still_requires_an_actor(block_types):
    with pytest.raises(CommandError, match="--actor-email is required"):
        run("--only", "event", "--exclude-pending")
    assert not ContentItem.objects.exists()


def test_unknown_actor_is_rejected_even_in_a_dry_run(block_types):
    with pytest.raises(CommandError, match="never creates one"):
        run("--dry-run", "--actor-email", "nobody@test.example")


def test_only_accepts_comma_separated_and_repeated_forms(block_types):
    a = run("--dry-run", "--only", "page,nec")
    b = run("--dry-run", "--only", "page", "--only", "nec")
    assert a == b and "16 selected" in a


# --- command: dry run --------------------------------------------------------


def test_dry_run_writes_and_audits_nothing_and_needs_no_actor(block_types):
    out = run("--dry-run", "--only", "event", "--exclude-pending")
    assert "6 selected" in out and "6 to create" in out and "Nothing was written" in out
    for slug in CONFIRMED_EVENTS:
        assert f"create event:{slug}" in out
    assert not ContentItem.objects.exists()
    assert not ContentVersion.objects.exists()
    assert not AuditLog.objects.filter(action="content.migrated").exists()


def test_dry_run_after_import_reports_unchanged(block_types):
    actor = make_user("importer@test.example")
    run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    out = run("--dry-run", "--only", "event", "--exclude-pending")
    assert "6 unchanged" in out and "0 to create" in out


def test_plan_detects_a_cross_slug_duplicate_event(block_types):
    actor = make_user("importer@test.example")
    run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    original = next(m for m in PAGE_MIGRATIONS if m.slug == "wildcard-ventures")
    renamed = replace(original, slug="wildcard-ventures-again")
    assert plan_migration(renamed, _block_types_by_key()) == "duplicate"


# --- command: the production import ------------------------------------------


def test_production_event_import_publishes_only_the_six_confirmed_events(block_types):
    actor = make_user("importer@test.example")
    out = run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    assert "6 created, 0 updated, 0 unchanged" in out

    events = ContentItem.objects.filter(content_type="event")
    assert set(events.values_list("slug", flat=True)) == CONFIRMED_EVENTS
    assert all(e.published_version_id for e in events)
    assert not EventDetail.objects.filter(pending=True).exists()
    assert not ContentItem.objects.exclude(content_type="event").exists()  # no pages, no blogs

    public = (
        dynamic_queries.resolve("published_events_past")["results"]
        + dynamic_queries.resolve("published_events_upcoming")["results"]
    )
    assert {r["slug"] for r in public} == CONFIRMED_EVENTS
    assert not any(r["pending"] for r in public)


def test_production_import_is_idempotent(block_types):
    actor = make_user("importer@test.example")
    run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    out = run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    assert "0 created, 0 updated, 6 unchanged" in out
    assert ContentItem.objects.filter(content_type="event").count() == 6


def test_optional_page_import_adds_the_sixteen_pages(block_types):
    actor = make_user("importer@test.example")
    run("--actor-email", actor.email, "--only", "event", "--exclude-pending")
    out = run("--actor-email", actor.email, "--only", "page,nec", "--exclude-pending")
    assert "16 created" in out
    assert ContentItem.objects.filter(content_type__in=["page", "nec"]).count() == 16
    assert not ContentItem.objects.filter(content_type="blog").exists()
