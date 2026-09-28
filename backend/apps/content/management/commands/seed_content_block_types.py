from django.core.management.base import BaseCommand
from django.db import transaction

from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.models import ContentBlockType


def seed_content_block_types() -> int:
    """Idempotent, like seed_rbac: writes/refreshes the block-type catalogue. Never
    deactivates a type not in BLOCK_TYPES (an editor may have added one via the API
    under content_type.manage — this command only owns the built-in set)."""
    with transaction.atomic():
        for spec in BLOCK_TYPES:
            ContentBlockType.objects.update_or_create(
                key=spec["key"],
                defaults={
                    "label": spec["label"],
                    "json_schema": spec["json_schema"],
                    "allowed_parent_keys": spec["allowed_parent_keys"],
                    "is_active": True,
                },
            )
    return len(BLOCK_TYPES)


class Command(BaseCommand):
    help = "Create/refresh the built-in content block-type catalogue. Safe to re-run."

    def handle(self, *args, **options):
        count = seed_content_block_types()
        self.stdout.write(self.style.SUCCESS(f"Content block types seeded: {count}."))
