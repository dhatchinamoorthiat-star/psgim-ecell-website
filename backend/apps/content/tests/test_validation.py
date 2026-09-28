"""Block document validation (apps.content.validation) — the only place blocks are trusted from."""

import pytest
from rest_framework.exceptions import ValidationError

from apps.content.models import ContentBlockType
from apps.content.validation import validate_blocks_document

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
