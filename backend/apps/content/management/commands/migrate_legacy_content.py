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


def apply_migration(migration: PageMigration, *, actor: User) -> tuple[ContentItem, bool]:
    """
    Returns (item, changed). `changed` is False when a rerun found the item
    already up to date (idempotency: no new version, no duplicate item).
    """
    document = {"schema_version": 1, "blocks": migration.blocks}
    validate_blocks_document(document, _block_types_by_key())

    with transaction.atomic():
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


def _max_number():
    from django.db.models import Max

    return Max("number")


class Command(BaseCommand):
    help = "Migrate the representative legacy TypeScript site data into the CMS (idempotent, safe to re-run)."

    def add_arguments(self, parser):
        parser.add_argument("--actor-email", required=True, help="An existing user's email to record as the import author.")

    def handle(self, *args, **options):
        try:
            actor = User.objects.get(email=options["actor_email"])
        except User.DoesNotExist as exc:
            raise CommandError(f"No user with email {options['actor_email']!r}. This command never creates one.") from exc

        if not ContentBlockType.objects.filter(key__in=[bt["key"] for bt in BLOCK_TYPES]).exists():
            raise CommandError("No block types found — run `manage.py seed_content_block_types` first.")

        created, updated, unchanged = 0, 0, 0
        for migration in PAGE_MIGRATIONS:
            item, changed = apply_migration(migration, actor=actor)
            if not changed:
                unchanged += 1
            elif item.versions.count() == 1:
                created += 1
            else:
                updated += 1
            self.stdout.write(f"  {migration.content_type}:{migration.slug} -> v{item.published_version.number}")

        self.stdout.write(
            self.style.SUCCESS(f"Migration complete: {created} created, {updated} updated, {unchanged} unchanged.")
        )
