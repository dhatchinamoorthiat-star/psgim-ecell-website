"""
The media-reference resolution pipeline (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
"Media reference resolution"): MediaAsset -> block image prop -> resolved
public API response -> BlockImageComponent. No Cloudinary secret or
client-controlled URL is involved — resolution reads only the already-
published `MediaAsset.delivery_url`/`alt_text`.
"""

import pytest

from apps.content.media_resolution import resolve_blocks_media
from apps.content.models import ContentBlockType, ContentItem, ContentVersion, MediaAsset, WorkflowState
from conftest import client_for, make_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def hero_type(db) -> ContentBlockType:
    return ContentBlockType.objects.create(
        key="hero", label="Hero",
        json_schema={"props": {"heading": {"type": "string", "required": True}, "image": {"type": "image"}}},
    )  # fmt: skip


def _doc(image_prop):
    return {"schema_version": 1, "blocks": [{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": image_prop}}]}


def test_media_reference_resolves_to_public_url_and_alt_text(hero_type):
    uploader = make_user("uploader@test.example")
    asset = MediaAsset.objects.create(
        cloudinary_public_id="p", delivery_url="https://res.cloudinary.com/x/p.jpg", uploaded_by=uploader,
        alt_text="A campus photo", width=800, height=600,
    )  # fmt: skip
    doc = _doc({"source": "media", "asset_id": str(asset.id)})
    resolved = resolve_blocks_media(doc, {"hero": hero_type})
    image = resolved["blocks"][0]["props"]["image"]
    assert image["url"] == "https://res.cloudinary.com/x/p.jpg"
    assert image["alt"] == "A campus photo"
    assert image["width"] == 800 and image["height"] == 600


def test_own_alt_overrides_asset_alt_text(hero_type):
    uploader = make_user("uploader2@test.example")
    asset = MediaAsset.objects.create(
        cloudinary_public_id="p", delivery_url="https://x.com/p.jpg", uploaded_by=uploader, alt_text="Asset alt"
    )
    doc = _doc({"source": "media", "asset_id": str(asset.id), "alt": "Block-level override"})
    resolved = resolve_blocks_media(doc, {"hero": hero_type})
    assert resolved["blocks"][0]["props"]["image"]["alt"] == "Block-level override"


def test_missing_media_asset_fails_safe(hero_type):
    doc = _doc({"source": "media", "asset_id": "00000000-0000-0000-0000-000000000000"})
    resolved = resolve_blocks_media(doc, {"hero": hero_type})
    assert resolved["blocks"][0]["props"]["image"] is None  # rendered as "no image", not a broken reference


def test_external_source_passes_through_unchanged(hero_type):
    doc = _doc({"source": "external", "url": "https://example.com/a.jpg", "alt": "External"})
    resolved = resolve_blocks_media(doc, {"hero": hero_type})
    assert resolved["blocks"][0]["props"]["image"] == {"source": "external", "url": "https://example.com/a.jpg", "alt": "External"}


def test_original_document_is_not_mutated(hero_type):
    uploader = make_user("uploader3@test.example")
    asset = MediaAsset.objects.create(cloudinary_public_id="p", delivery_url="https://x.com/p.jpg", uploaded_by=uploader)
    doc = _doc({"source": "media", "asset_id": str(asset.id)})
    resolve_blocks_media(doc, {"hero": hero_type})
    assert doc["blocks"][0]["props"]["image"] == {"source": "media", "asset_id": str(asset.id)}  # untouched


def test_public_api_returns_resolved_media_for_published_content(org):
    uploader = org["super_admin"]
    asset = MediaAsset.objects.create(
        cloudinary_public_id="p", delivery_url="https://res.cloudinary.com/x/p.jpg", uploaded_by=uploader, alt_text="Real photo"
    )
    ContentBlockType.objects.create(
        key="hero", label="Hero",
        json_schema={"props": {"heading": {"type": "string", "required": True}, "image": {"type": "image"}}},
    )  # fmt: skip
    item = ContentItem.objects.create(content_type="page", slug="media-page", created_by=uploader)
    version = ContentVersion.objects.create(
        content_item=item, number=1, state=WorkflowState.PUBLISHED, author=uploader,
        blocks={
            "schema_version": 1,
            "blocks": [{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": {"source": "media", "asset_id": str(asset.id)}}}],
        },
    )  # fmt: skip
    item.published_version = version
    item.state = WorkflowState.PUBLISHED
    item.save(update_fields=["published_version", "state"])

    r = client_for(None).get("/api/v1/content/public/page/media-page")
    assert r.status_code == 200
    image = r.data["blocks"]["blocks"][0]["props"]["image"]
    assert image["url"] == "https://res.cloudinary.com/x/p.jpg"
    assert image["alt"] == "Real photo"


def test_draft_content_media_is_never_publicly_resolvable(org):
    """A draft (never published) is unreachable through the public endpoint at all —
    its media references, resolved or not, never leave the server."""
    uploader = org["super_admin"]
    ContentBlockType.objects.create(
        key="hero", label="Hero",
        json_schema={"props": {"heading": {"type": "string", "required": True}, "image": {"type": "image"}}},
    )  # fmt: skip
    item = ContentItem.objects.create(content_type="page", slug="draft-media-page", created_by=uploader)
    ContentVersion.objects.create(
        content_item=item, number=1, state=WorkflowState.DRAFT, author=uploader,
        blocks={"schema_version": 1, "blocks": [{"id": "h1", "type": "hero", "props": {"heading": "Hi"}}]},
    )  # fmt: skip
    r = client_for(None).get("/api/v1/content/public/page/draft-media-page")
    assert r.status_code == 404
