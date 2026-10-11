"""
Versioned event details (Phase B, ADR-012).

An event's structured fields live on each `ContentVersion.detail` as JSON;
`EventDetail` is the *published projection* of the live version only.
`workflow.publish` validates and projects; nothing else writes EventDetail
except the legacy importer (which publishes directly, and now also records
the same fields on its version).

Validation is the security boundary for untrusted event data:
- links must be absolute https URLs (no http:, javascript:, data:, ...);
- images must be https URLs or site-relative paths ("/events/x/01.jpg"),
  never protocol-relative ("//evil") or other schemes;
- every string is length-capped; lists are size-capped;
- provenance fields (`pending`, `source`) are not writable through the API.
Text is stored as plain text; the Angular site renders it with
interpolation only (never innerHTML), so no HTML is ever interpreted.
"""

from datetime import datetime
from urllib.parse import urlsplit

from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from .models import EventDetail

# Every EventDetail field carried on a version (provenance included).
FIELDS = [
    "title", "kind", "starts_at", "ends_at", "venue", "summary", "description", "time_label", "audience",
    "organizer", "registration_status", "registration_link", "turnout", "pending", "linkedin_url", "source",
    "hashtags", "speakers", "featured_image", "gallery", "related_initiative",
]  # fmt: skip
# Set by the system (importer / API defaults), never by an editor.
PROVENANCE_FIELDS = {"pending", "source"}
DATETIME_FIELDS = {"starts_at", "ends_at"}

MAX_SPEAKERS = 50
MAX_GALLERY = 30
MAX_HASHTAGS = 20


def _validate_https_url(value: str) -> str:
    if not value:
        return value
    parts = urlsplit(value)
    if parts.scheme != "https" or not parts.netloc:
        raise serializers.ValidationError("Must be an https:// link.")
    return value


def _validate_image_src(value: str) -> str:
    """https URL, or a site-relative path. Rejects //host, backslashes and any other scheme."""
    if not value:
        return value
    if value.startswith("/") and not value.startswith("//") and "\\" not in value and ":" not in value.split("?")[0]:
        return value
    return _validate_https_url(value)


class SpeakerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    designation = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    org = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")


class GalleryImageSerializer(serializers.Serializer):
    src = serializers.CharField(max_length=500, validators=[_validate_image_src])
    alt = serializers.CharField(max_length=300)  # required: accessibility


class EventDetailInputSerializer(serializers.Serializer):
    """The editor-writable fields. Unknown keys are rejected (no mass assignment)."""

    title = serializers.CharField(max_length=200)
    kind = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    starts_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    ends_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    venue = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    summary = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    description = serializers.CharField(max_length=10000, required=False, allow_blank=True, default="")
    time_label = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    audience = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    organizer = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    registration_status = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    registration_link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default="", validators=[_validate_https_url]
    )
    turnout = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    linkedin_url = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default="", validators=[_validate_https_url]
    )
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=60), required=False, default=list, max_length=MAX_HASHTAGS
    )
    speakers = SpeakerSerializer(many=True, required=False, default=list, max_length=MAX_SPEAKERS)
    featured_image = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default="", validators=[_validate_image_src]
    )
    gallery = GalleryImageSerializer(many=True, required=False, default=list, max_length=MAX_GALLERY)
    related_initiative = serializers.SlugField(max_length=80, required=False, allow_blank=True, default="")

    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({key: ["Unknown or read-only field."] for key in sorted(unknown)})
        return super().to_internal_value(data)

    def validate(self, attrs):
        starts, ends = attrs.get("starts_at"), attrs.get("ends_at")
        if starts and ends and ends < starts:
            raise serializers.ValidationError({"ends_at": ["Must not be before starts_at."]})
        return attrs


def to_json(values: dict) -> dict:
    """JSON-safe copy (datetimes as ISO 8601) restricted to FIELDS."""
    out = {}
    for key in FIELDS:
        if key in values:
            value = values[key]
            out[key] = value.isoformat() if isinstance(value, datetime) else value
    return out


def validate_editor_input(data, *, current: dict | None = None, source: str = "manual") -> dict:
    """
    Validate editor input and merge it over `current` provenance. Returns the
    full JSON detail to store on a draft version. Provenance is preserved from
    `current` (an imported event stays `source=linkedin`), or defaulted for a
    brand-new event (`pending=False`, `source=manual`).
    """
    s = EventDetailInputSerializer(data=data)
    s.is_valid(raise_exception=True)
    current = current or {}
    provenance = {
        "pending": bool(current.get("pending", False)),
        "source": current.get("source") or source,
    }
    return to_json({**s.validated_data, **provenance})


def validate_for_publish(detail: dict) -> None:
    """A version may only go live with complete, valid structured details."""
    editable = {k: v for k, v in (detail or {}).items() if k not in PROVENANCE_FIELDS}
    s = EventDetailInputSerializer(data=editable)
    if not s.is_valid():
        raise serializers.ValidationError({"detail": s.errors})


def from_projection(event_detail: EventDetail) -> dict:
    return to_json({key: getattr(event_detail, key) for key in FIELDS})


def project(item, version) -> EventDetail:
    """Write the version's detail into EventDetail (the published projection)."""
    detail = version.detail or {}
    values = {}
    for key in FIELDS:
        if key not in detail:
            continue
        value = detail[key]
        if key in DATETIME_FIELDS:
            value = parse_datetime(value) if value else None
        values[key] = value if value is not None or key in DATETIME_FIELDS else ""
    obj, _ = EventDetail.objects.update_or_create(content_item=item, defaults=values)
    return obj
