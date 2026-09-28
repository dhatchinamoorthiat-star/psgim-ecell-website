"""Block document validation (apps.content.validation) — the only place blocks are trusted from."""

import pytest
from rest_framework.exceptions import ValidationError

from apps.content.models import ContentBlockType, MediaAsset
from apps.content.validation import validate_blocks_document, validate_image_accessibility
from conftest import make_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def hero_type(db) -> ContentBlockType:
    return ContentBlockType.objects.create(
        key="hero",
        label="Hero",
        json_schema={"props": {"heading": {"type": "string", "required": True, "max_length": 50}, "image": {"type": "url"}}},
    )


def _doc(blocks):
    return {"schema_version": 1, "blocks": blocks}


def test_valid_document_passes(hero_type):
    validate_blocks_document(_doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi"}}]), {"hero": hero_type})


def test_unknown_block_type_rejected(hero_type):
    with pytest.raises(ValidationError):
        validate_blocks_document(_doc([{"id": "b1", "type": "raw_html", "props": {}}]), {"hero": hero_type})


def test_inactive_block_type_rejected(hero_type):
    hero_type.is_active = False
    hero_type.save()
    with pytest.raises(ValidationError):
        validate_blocks_document(_doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi"}}]), {"hero": hero_type})


def test_missing_required_prop_rejected(hero_type):
    with pytest.raises(ValidationError):
        validate_blocks_document(_doc([{"id": "h1", "type": "hero", "props": {}}]), {"hero": hero_type})


def test_unknown_prop_rejected(hero_type):
    with pytest.raises(ValidationError):
        validate_blocks_document(
            _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "onclick": "steal()"}}]), {"hero": hero_type}
        )


def test_javascript_url_rejected(hero_type):
    with pytest.raises(ValidationError):
        validate_blocks_document(
            _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": "javascript:alert(1)"}}]),
            {"hero": hero_type},
        )


def test_relative_and_https_urls_accepted(hero_type):
    validate_blocks_document(
        _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": "/media/x.jpg"}}]), {"hero": hero_type}
    )
    validate_blocks_document(
        _doc([{"id": "h2", "type": "hero", "props": {"heading": "Hi", "image": "https://res.cloudinary.com/x.jpg"}}]),
        {"hero": hero_type},
    )


def test_wrong_schema_version_rejected(hero_type):
    with pytest.raises(ValidationError):
        validate_blocks_document({"schema_version": 2, "blocks": []}, {"hero": hero_type})


def test_disallowed_nesting_rejected(hero_type):
    hero_type.allowed_parent_keys = ["section"]
    hero_type.save()
    with pytest.raises(ValidationError):
        validate_blocks_document(_doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi"}}]), {"hero": hero_type})


# --- object / object_list props (gate-review fix: structured list items) ---------------


@pytest.fixture
def stats_type(db) -> ContentBlockType:
    return ContentBlockType.objects.create(
        key="stats",
        label="Stats",
        json_schema={
            "props": {
                "items": {
                    "type": "list", "item_type": "object", "required": True,
                    "item_schema": {
                        "properties": {
                            "value": {"type": "string", "required": True, "max_length": 40},
                            "label": {"type": "string", "required": True, "max_length": 120},
                            "count": {"type": "int", "required": False},
                        }
                    },
                }
            }
        },  # fmt: skip
    )


@pytest.fixture
def card_grid_type(db) -> ContentBlockType:
    """A single `object`-typed prop (not a list), to test the bare object type distinctly
    from object_list."""
    return ContentBlockType.objects.create(
        key="card_grid",
        label="Card grid",
        json_schema={
            "props": {
                "featured": {
                    "type": "object",
                    "required": True,
                    "properties": {
                        "title": {"type": "string", "required": True, "max_length": 120},
                        "body": {"type": "string", "required": True, "max_length": 600},
                        "link": {"type": "object", "required": False, "properties": {"url": {"type": "url", "required": True}}},
                    },
                }
            }
        },
    )


def test_valid_object_list_passes(stats_type):
    doc = _doc([{"id": "s1", "type": "stats", "props": {"items": [{"value": "23", "label": "Members", "count": 23}]}}])
    validate_blocks_document(doc, {"stats": stats_type})


def test_object_list_missing_required_property_rejected(stats_type):
    doc = _doc([{"id": "s1", "type": "stats", "props": {"items": [{"value": "23"}]}}])  # missing "label"
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"stats": stats_type})


def test_object_list_unknown_property_rejected(stats_type):
    doc = _doc([{"id": "s1", "type": "stats", "props": {"items": [{"value": "23", "label": "Members", "evil": "x"}]}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"stats": stats_type})


def test_object_list_invalid_nested_primitive_rejected(stats_type):
    doc = _doc([{"id": "s1", "type": "stats", "props": {"items": [{"value": "23", "label": "Members", "count": "not-an-int"}]}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"stats": stats_type})


def test_valid_nested_object_passes(card_grid_type):
    doc = _doc([{
        "id": "c1", "type": "card_grid",
        "props": {"featured": {"title": "T", "body": "B", "link": {"url": "https://example.com"}}},
    }])  # fmt: skip
    validate_blocks_document(doc, {"card_grid": card_grid_type})


def test_nested_object_missing_required_property_rejected(card_grid_type):
    doc = _doc([{"id": "c1", "type": "card_grid", "props": {"featured": {"title": "T"}}}])  # missing "body"
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"card_grid": card_grid_type})


def test_nested_object_unknown_property_rejected(card_grid_type):
    doc = _doc([{"id": "c1", "type": "card_grid", "props": {"featured": {"title": "T", "body": "B", "evil": "x"}}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"card_grid": card_grid_type})


def test_malicious_url_inside_nested_object_rejected(card_grid_type):
    doc = _doc([{
        "id": "c1", "type": "card_grid",
        "props": {"featured": {"title": "T", "body": "B", "link": {"url": "javascript:alert(1)"}}},
    }])  # fmt: skip
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"card_grid": card_grid_type})


def _nested_object_spec(levels: int) -> dict:
    """A finite (non-circular, JSON-serializable) schema that legitimately allows
    `levels` of "wrap" nesting, so a value using all of them is valid per-level and
    only fails on the _MAX_PROP_DEPTH guard itself, not an unrelated schema error."""
    spec = {"type": "object", "required": False, "properties": {"label": {"type": "string", "required": True}}}
    for _ in range(levels):
        spec = {"type": "object", "required": False, "properties": {"label": {"type": "string", "required": True}, "wrap": spec}}
    return spec


def test_excessive_prop_nesting_rejected(db):
    block_type = ContentBlockType.objects.create(
        key="recursive", label="Recursive",
        json_schema={"props": {"root": {**_nested_object_spec(12), "required": True}}},
    )  # fmt: skip
    value = {"label": "leaf"}
    for _ in range(12):
        value = {"label": "x", "wrap": value}
    doc = _doc([{"id": "r1", "type": "recursive", "props": {"root": value}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"recursive": block_type})


# --- image props (media reference vs. external URL) -----------------------------------


@pytest.fixture
def hero_image_type(db) -> ContentBlockType:
    return ContentBlockType.objects.create(
        key="hero",
        label="Hero",
        json_schema={"props": {"heading": {"type": "string", "required": True}, "image": {"type": "image"}}},
    )


def test_valid_media_image_passes(hero_image_type):
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "media", "asset_id": "x"}}}])
    validate_blocks_document(doc, {"hero": hero_image_type})


def test_valid_external_image_passes(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "external", "url": "https://example.com/a.jpg", "alt": "A photo"}},
    }])  # fmt: skip
    validate_blocks_document(doc, {"hero": hero_image_type})


def test_image_missing_source_rejected(hero_image_type):
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"url": "https://example.com/a.jpg"}}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"hero": hero_image_type})


def test_image_external_without_url_rejected(hero_image_type):
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "external", "alt": "x"}}}])
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"hero": hero_image_type})


def test_image_external_javascript_url_rejected(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "external", "url": "javascript:alert(1)", "alt": "x"}},
    }])  # fmt: skip
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"hero": hero_image_type})


def test_image_unknown_field_rejected(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "media", "asset_id": "x", "onclick": "steal()"}},
    }])  # fmt: skip
    with pytest.raises(ValidationError):
        validate_blocks_document(doc, {"hero": hero_image_type})


# --- publish-time accessibility gate (validate_image_accessibility) -------------------


def test_external_image_without_alt_fails_accessibility(hero_image_type):
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "external", "url": "https://x.com/a.jpg"}}}])
    with pytest.raises(ValidationError):
        validate_image_accessibility(doc, {"hero": hero_image_type})


def test_external_image_with_empty_alt_fails_accessibility(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "external", "url": "https://x.com/a.jpg", "alt": "   "}},
    }])  # fmt: skip
    with pytest.raises(ValidationError):
        validate_image_accessibility(doc, {"hero": hero_image_type})


def test_external_image_with_alt_passes_accessibility(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "external", "url": "https://x.com/a.jpg", "alt": "A photo"}},
    }])  # fmt: skip
    validate_image_accessibility(doc, {"hero": hero_image_type})


def test_media_image_without_asset_alt_or_override_fails_accessibility(hero_image_type, db):
    uploader = make_user("uploader@test.example")
    asset = MediaAsset.objects.create(cloudinary_public_id="x", delivery_url="https://x.com/a.jpg", uploaded_by=uploader)
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "media", "asset_id": str(asset.id)}}}])
    with pytest.raises(ValidationError):
        validate_image_accessibility(doc, {"hero": hero_image_type})


def test_media_image_with_asset_alt_text_passes_accessibility(hero_image_type, db):
    uploader = make_user("uploader2@test.example")
    asset = MediaAsset.objects.create(
        cloudinary_public_id="x", delivery_url="https://x.com/a.jpg", uploaded_by=uploader, alt_text="A campus photo"
    )
    doc = _doc([{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "media", "asset_id": str(asset.id)}}}])
    validate_image_accessibility(doc, {"hero": hero_image_type})


def test_media_image_with_own_alt_override_passes_even_without_asset_alt(hero_image_type, db):
    uploader = make_user("uploader3@test.example")
    asset = MediaAsset.objects.create(cloudinary_public_id="x", delivery_url="https://x.com/a.jpg", uploaded_by=uploader)
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "media", "asset_id": str(asset.id), "alt": "Override alt"}},
    }])  # fmt: skip
    validate_image_accessibility(doc, {"hero": hero_image_type})


def test_media_image_with_dangling_asset_id_fails_accessibility(hero_image_type):
    doc = _doc([{
        "id": "h1", "type": "hero",
        "props": {"heading": "Hi", "image": {"source": "media", "asset_id": "00000000-0000-0000-0000-000000000000"}},
    }])  # fmt: skip
    with pytest.raises(ValidationError):
        validate_image_accessibility(doc, {"hero": hero_image_type})
