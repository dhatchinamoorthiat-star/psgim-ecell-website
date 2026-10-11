"""
Backfill ContentVersion.detail for existing events (Phase B, ADR-012).

Before this, an event's structured fields existed only on EventDetail (one
row per item, written by the importer), so:

- the PUBLISHED version gets EventDetail's current values — exactly what is
  live, so published data is preserved unchanged;
- the current DRAFT (if any) gets the same values as its starting point.
  Drafts could only ever differ in `blocks` before this field existed, so
  this adds the missing structured fields without overwriting any draft
  change;
- only empty `detail` values are filled — a version that already has detail
  is never touched, so re-running is a no-op;
- older/archived versions are left empty (their historical structured
  values were never recorded); `workflow.revert` falls back to the item's
  current detail for those.

Reverse is a no-op: the schema migration 0006 removes the column.
"""

from django.db import migrations

FIELDS = [
    "title", "kind", "starts_at", "ends_at", "venue", "summary", "description", "time_label", "audience",
    "organizer", "registration_status", "registration_link", "turnout", "pending", "linkedin_url", "source",
    "hashtags", "speakers", "featured_image", "gallery", "related_initiative",
]  # fmt: skip


def _as_json(event_detail) -> dict:
    out = {}
    for key in FIELDS:
        value = getattr(event_detail, key)
        out[key] = value.isoformat() if hasattr(value, "isoformat") else value
    return out


def backfill(apps, schema_editor):
    ContentItem = apps.get_model("content", "ContentItem")
    ContentVersion = apps.get_model("content", "ContentVersion")
    EventDetail = apps.get_model("content", "EventDetail")

    for item in ContentItem.objects.filter(content_type="event"):
        projection = EventDetail.objects.filter(content_item_id=item.pk).first()
        if projection is None:
            continue  # never had structured fields; nothing to preserve
        values = _as_json(projection)
        targets = {pk for pk in (item.published_version_id, item.draft_version_id) if pk}
        for version in ContentVersion.objects.filter(pk__in=targets):
            if not version.detail:
                version.detail = values
                version.save(update_fields=["detail"])


class Migration(migrations.Migration):
    dependencies = [("content", "0006_contentversion_detail")]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
