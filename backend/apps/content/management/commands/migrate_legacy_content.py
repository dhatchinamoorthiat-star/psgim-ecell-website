"""
Idempotently imports the representative page set in
`apps.content.legacy_migration.PAGE_MIGRATIONS` as published `ContentItem`/
`ContentVersion`/`PageDetail` rows (docs/22_MIGRATION_MATRIX.md, task §4).

This is a data-import operation on already-live static site content, not a
user authoring action — it does not go through the interactive
draft/submit/review/approve workflow (`apps.content.workflow`), which would
impose review friction on content that is, by definition, already the
institution's current public copy. It still writes a normal `AuditLog` row
per created/updated version (actor=None, i.e. system) so the import is
traceable like every other content mutation.

Requires an existing user's email (`--actor-email`) to record as the
version's author — this command never creates or invents a user (task: "do
not invent Super Admins"). Run it against a user who already holds
`content.publish` at the right scope, or the created versions won't be
publishable later through the normal API even though this command writes
`published_version` directly for the initial import.

Selection and preview (A2, docs/28_A2_DEPLOYMENT_RUNBOOK.md "Content import"):

- `--only TYPE` (repeatable or comma-separated: page, nec, event, blog,
  initiative) limits the run to those content types.
- `--exclude-pending` skips every item whose own `pending` flag is set — the
  illustrative sample events and sample blog posts. It does not look inside
  page blocks: a page's in-page "to be confirmed" marker is editorial copy
  on real institutional content, not an illustrative item.
- `--dry-run` validates every selected document and reports, per item,
  create / update / unchanged / duplicate — writing nothing, auditing
  nothing, and needing no `--actor-email`.

Every excluded item is listed with its reason, so an operator can see
exactly what was left out. Production import (runbook):
`--only event --exclude-pending` (the six confirmed events), optionally
followed by `--only page,nec` (the sixteen institutional pages).
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.audit import service as audit
from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.legacy_migration import PAGE_MIGRATIONS, PageMigration
from apps.content.models import (
    BlogDetail,
    ContentBlockType,
    ContentItem,
    ContentType,
    ContentVersion,
    EventDetail,
    NECDetail,
    PageDetail,
    WorkflowState,
)
from apps.content.validation import validate_blocks_document

_DETAIL_MODEL_BY_CONTENT_TYPE = {
    "page": PageDetail,
    "nec": NECDetail,
    "event": EventDetail,
    "blog": BlogDetail,
}


def _block_types_by_key() -> dict:
    return {bt.key: bt for bt in ContentBlockType.objects.filter(is_active=True)}


def _find_duplicate_event(migration: PageMigration) -> ContentItem | None:
    """
    Event-specific duplicate guard beyond the (content_type, slug) uniqueness
    `get_or_create` already enforces (task: "The LinkedIn URL should be
    treated as an important external identifier... also use title + date as
    a secondary duplicate check"). Only matches a *different* slug — the
    normal update-in-place path already handles a rerun against the same
    slug, so this only ever fires for an accidental second import of the
    same real-world event under a new id.
    """
    if migration.content_type != "event":
        return None
    linkedin_url = migration.detail_fields.get("linkedin_url")
    if linkedin_url:
        existing = (
            EventDetail.objects.filter(linkedin_url=linkedin_url)
            .exclude(content_item__slug=migration.slug)
            .select_related("content_item")
            .first()
        )
        if existing:
            return existing.content_item
    starts_at = migration.detail_fields.get("starts_at")
    if starts_at:
        existing = (
            EventDetail.objects.filter(title=migration.title, starts_at=starts_at)
            .exclude(content_item__slug=migration.slug)
            .select_related("content_item")
            .first()
        )
        if existing:
            return existing.content_item
    return None


def apply_migration(migration: PageMigration, *, actor: User) -> tuple[ContentItem, bool]:
    """
    Returns (item, changed). `changed` is False when a rerun found the item
    already up to date (idempotency: no new version, no duplicate item).
    """
    document = {"schema_version": 1, "blocks": migration.blocks}
    validate_blocks_document(document, _block_types_by_key())

    with transaction.atomic():
        duplicate = _find_duplicate_event(migration)
        if duplicate is not None:
            return duplicate, False  # same LinkedIn URL / title+date already imported under another slug

        item, created = ContentItem.objects.select_for_update().get_or_create(
            content_type=migration.content_type, slug=migration.slug, defaults={"created_by": actor}
        )
        current = item.published_version
        if not created and current is not None and current.blocks == document and current.seo == migration.seo:
            return item, False  # rerun, nothing changed — do not duplicate

        next_number = (item.versions.aggregate(n=_max_number())["n"] or 0) + 1
        version = ContentVersion.objects.create(
            content_item=item, number=next_number, state=WorkflowState.PUBLISHED,
            blocks=document, seo=migration.seo, author=actor,
            change_note=f"Migrated from web/src/app/core/data (legacy_migration.{migration.slug})",
        )  # fmt: skip
        item.published_version = version
        item.state = WorkflowState.PUBLISHED
        item.save(update_fields=["published_version", "state", "updated_at"])

        detail_model = _DETAIL_MODEL_BY_CONTENT_TYPE.get(migration.content_type)
        if detail_model is not None:
            detail_model.objects.update_or_create(
                content_item=item, defaults={"title": migration.title, **migration.detail_fields}
            )

        audit.record(
            None, "content.migrated", actor=actor, target=version,
            summary=f"{'Created' if created else 'Updated'} {item} from legacy site data (v{version.number})",
            after={"slug": migration.slug, "content_type": migration.content_type},
        )  # fmt: skip
        return item, True


def is_pending(migration: PageMigration) -> bool:
    """The item itself is illustrative (sample event/blog), per its own `pending` flag."""
    return bool(migration.detail_fields.get("pending"))


def select_migrations(
    migrations: list[PageMigration], *, only: set[str] | None = None, exclude_pending: bool = False
) -> tuple[list[PageMigration], list[tuple[PageMigration, str]]]:
    """Returns (selected, excluded-with-reason), preserving the source order."""
    selected, excluded = [], []
    for migration in migrations:
        if only and migration.content_type not in only:
            excluded.append((migration, "type not selected"))
        elif exclude_pending and is_pending(migration):
            excluded.append((migration, "illustrative (pending)"))
        else:
            selected.append(migration)
    return selected, excluded


def plan_migration(migration: PageMigration, block_types: dict) -> str:
    """
    What `apply_migration` would do, without writing: "create", "update",
    "unchanged" or "duplicate". Runs the same block validation, so a dry run
    fails on exactly the documents a real run would fail on.
    """
    document = {"schema_version": 1, "blocks": migration.blocks}
    validate_blocks_document(document, block_types)
    if _find_duplicate_event(migration) is not None:
        return "duplicate"
    item = (
        ContentItem.objects.filter(content_type=migration.content_type, slug=migration.slug)
        .select_related("published_version")
        .first()
    )
    if item is None:
        return "create"
    current = item.published_version
    if current is not None and current.blocks == document and current.seo == migration.seo:
        return "unchanged"
    return "update"


def _parse_only(values: list[str] | None) -> set[str] | None:
    if not values:
        return None
    requested = {part.strip().lower() for value in values for part in value.split(",") if part.strip()}
    unknown = requested - set(ContentType.values)
    if unknown:
        raise CommandError(
            f"Unknown content type(s) for --only: {', '.join(sorted(unknown))}. Choose from {', '.join(ContentType.values)}."
        )
    return requested


def _max_number():
    from django.db.models import Max

    return Max("number")


class Command(BaseCommand):
    help = "Migrate the representative legacy TypeScript site data into the CMS (idempotent, safe to re-run)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--actor-email",
            help="An existing user's email to record as the import author. Required unless --dry-run.",
        )
        parser.add_argument(
            "--only",
            action="append",
            metavar="TYPE",
            help=f"Limit to these content types (repeatable or comma-separated): {', '.join(ContentType.values)}.",
        )
        parser.add_argument(
            "--exclude-pending",
            action="store_true",
            help="Skip illustrative items (sample events and sample blog posts flagged pending).",
        )
        parser.add_argument("--dry-run", action="store_true", help="Validate and report what would change; write nothing.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        only = _parse_only(options["only"])
        actor = None
        if options["actor_email"]:
            try:
                actor = User.objects.get(email=options["actor_email"])
            except User.DoesNotExist as exc:
                raise CommandError(f"No user with email {options['actor_email']!r}. This command never creates one.") from exc
        elif not dry_run:
            raise CommandError("--actor-email is required (only --dry-run may omit it).")

        if not ContentBlockType.objects.filter(key__in=[bt["key"] for bt in BLOCK_TYPES]).exists():
            raise CommandError("No block types found — run `manage.py seed_content_block_types` first.")

        selected, excluded = select_migrations(PAGE_MIGRATIONS, only=only, exclude_pending=options["exclude_pending"])
        prefix = "[dry run] " if dry_run else ""
        for migration, reason in excluded:
            self.stdout.write(f"  {prefix}skip {migration.content_type}:{migration.slug} ({reason})")

        if dry_run:
            block_types = _block_types_by_key()
            counts = {"create": 0, "update": 0, "unchanged": 0, "duplicate": 0}
            for migration in selected:
                outcome = plan_migration(migration, block_types)
                counts[outcome] += 1
                self.stdout.write(f"  {prefix}{outcome} {migration.content_type}:{migration.slug}")
            self.stdout.write(
                self.style.SUCCESS(
                    f"{prefix}{len(selected)} selected, {len(excluded)} excluded: {counts['create']} to create, "
                    f"{counts['update']} to update, {counts['unchanged']} unchanged, {counts['duplicate']} duplicate. "
                    "Nothing was written."
                )
            )
            return

        created, updated, unchanged = 0, 0, 0
        for migration in selected:
            item, changed = apply_migration(migration, actor=actor)
            if not changed:
                unchanged += 1
            elif item.versions.count() == 1:
                created += 1
            else:
                updated += 1
            self.stdout.write(f"  {migration.content_type}:{migration.slug} -> v{item.published_version.number}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Migration complete: {created} created, {updated} updated, {unchanged} unchanged"
                + (f"; {len(excluded)} excluded." if excluded else ".")
            )
        )
