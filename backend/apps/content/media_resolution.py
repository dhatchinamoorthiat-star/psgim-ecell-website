"""
Resolves `source: "media"` image props to a real delivery URL + alt text
before a published document leaves the API (task: "media resolution is
required before 2C"). This is the missing half of the pipeline:

    MediaAsset (uploaded, scoped)
        -> block image prop {"source": "media", "asset_id": "<uuid>"}
        -> published ContentVersion.blocks (stored as authored, unresolved)
        -> resolve_blocks_media() [THIS MODULE]
        -> {"source": "media", "asset_id": ..., "url": <delivery_url>, "alt": <resolved alt>}
        -> PublicContentDetailView response
        -> BlockImageComponent renders <img [src]="url">

Only ever called on a `ContentVersion` that is already `published_version`
of some `ContentItem` (see `views.PublicContentDetailView`,
`dynamic_queries.py`) — never on a draft. This does not change what's
*authorized*: MediaAsset upload/listing scope (apps.content.views) governs
who can attach an asset to a document in the first place; once a document
is published, whatever media it references is, definitionally, part of
public page content, exactly like every other published field.

Missing/deleted assets fail safe: the image prop is dropped (no `url`), so
`BlockImageComponent` renders nothing rather than a broken image request or
a 500.
"""

import copy

from .models import MediaAsset
from .validation import iter_image_props


def resolve_blocks_media(document: dict, block_types_by_key: dict) -> dict:
    resolved = copy.deepcopy(document)
    images = list(iter_image_props(resolved, block_types_by_key))
    asset_ids = {img.get("asset_id") for _, img in images if isinstance(img, dict) and img.get("source") == "media"}
    asset_ids.discard(None)
    assets = {str(a.id): a for a in MediaAsset.objects.filter(id__in=asset_ids)} if asset_ids else {}

    for path, image in images:
        if not isinstance(image, dict) or image.get("source") != "media":
            continue
        asset = assets.get(image.get("asset_id"))
        _set_at_path(resolved, path, _resolved_media_value(image, asset))
    return resolved


def _resolved_media_value(image: dict, asset: MediaAsset | None) -> dict | None:
    if asset is None:
        return None  # dangling reference — fail safe, render nothing
    return {
        "source": "media",
        "asset_id": image.get("asset_id"),
        "url": asset.delivery_url,
        "alt": (image.get("alt") or "").strip() or asset.alt_text,
        "width": asset.width,
        "height": asset.height,
    }


def _set_at_path(document: dict, path: str, value) -> None:
    """
    `path` is one of `iter_image_props`'s dotted/bracketed paths, e.g.
    `blocks[0].props.image` or `blocks[2].props.images[1].image`. Walks the
    same structure to write the resolved value back in place.
    """
    tokens = _tokenize(path)
    node = document
    for tok in tokens[:-1]:
        node = node[tok]
    node[tokens[-1]] = value


def _tokenize(path: str) -> list:
    tokens: list = []
    current = ""
    i = 0
    while i < len(path):
        ch = path[i]
        if ch == ".":
            if current:
                tokens.append(current)
                current = ""
            i += 1
        elif ch == "[":
            if current:
                tokens.append(current)
                current = ""
            end = path.index("]", i)
            tokens.append(int(path[i + 1 : end]))
            i = end + 1
        else:
            current += ch
            i += 1
    if current:
        tokens.append(current)
    return tokens
