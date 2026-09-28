"""
Server-side validation of `ContentVersion.blocks` documents
(docs/25_VISUAL_EDITOR_ARCHITECTURE.md, task security boundary: never trust
client-side validation alone).

`ContentBlockType.json_schema` uses a small internal format rather than full
JSON Schema draft-07, because block props are a closed set of declared
shapes with no need for draft-07's combinators/refs:

    {"props": {
        "heading": {"type": "string", "required": true, "max_length": 200},
        "image":   {"type": "image"},
        "items":   {"type": "list", "item_type": "object", "item_schema": {
                        "properties": {
                            "value": {"type": "string", "required": true},
                            "label": {"type": "string", "required": true},
                            "count": {"type": "int", "required": false},
                            "suffix": {"type": "string", "required": false}
                        }
                    }},
        "align":   {"type": "string", "enum": ["left", "center", "right"]}
    }}

Supported prop types: string, url, int, bool, object, list, image.

- `object`: a fixed-shape nested record. The spec carries its own
  `properties: {name: spec}` (same spec grammar, recursive). Unknown keys
  are rejected, exactly like top-level block props.
- `list`: an ordered collection. `item_type` selects what each element is
  validated as — any of the scalar types, or `"object"` (in which case the
  spec must also carry `item_schema: {"properties": {...}}`).
- `image`: see the module docstring in `apps.content.media_refs` — a
  structured reference to either a `MediaAsset` or an explicit external URL,
  never a bare string. This is what replaces the old bare `url`-typed image
  props; `url` itself remains for non-image links (CTA targets, etc.).

Nesting is bounded by `_MAX_PROP_DEPTH` independently of block-tree nesting
(`_MAX_BLOCK_DEPTH`), so a malicious deeply-nested object graph inside a
single block's props can't bypass the block-level depth guard.
"""

from urllib.parse import urlparse

from rest_framework.exceptions import ValidationError

_ALLOWED_URL_SCHEMES = {"https", "http"}  # http allowed for local dev media only
_MAX_BLOCK_DEPTH = 6
_MAX_PROP_DEPTH = 6
_SCALAR_TYPES = {"string", "url", "int", "bool"}
_IMAGE_SOURCES = {"media", "external"}


def _validate_url(value, path: str) -> None:
    if not isinstance(value, str):
        raise ValidationError({path: ["Must be a string URL."]})
    if value.startswith("/"):
        return  # relative path — safe
    parsed = urlparse(value)
    if parsed.scheme not in _ALLOWED_URL_SCHEMES:
        raise ValidationError({path: [f"URL scheme {parsed.scheme!r} is not allowed."]})


def _validate_image(value, path: str) -> None:
    """
    Structured image reference (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
    "Image props"). Shape-only validation here; whether alt text is
    *present where required* is an accessibility gate enforced separately
    at publish time (`validate_image_accessibility`), not at draft-save
    time — an editor must be able to save a draft with a picked image
    before typing the caption.

        {"source": "media", "asset_id": "<uuid>", "alt": "<string, optional>"}
        {"source": "external", "url": "<https url>", "alt": "<string, optional>"}
    """
    if not isinstance(value, dict):
        raise ValidationError({path: ["An image prop must be an object with a source."]})
    source = value.get("source")
    if source not in _IMAGE_SOURCES:
        raise ValidationError({f"{path}.source": [f"Must be one of {sorted(_IMAGE_SOURCES)}."]})
    alt = value.get("alt", "")
    if not isinstance(alt, str):
        raise ValidationError({f"{path}.alt": ["Must be a string."]})
    if source == "media":
        asset_id = value.get("asset_id")
        if not isinstance(asset_id, str) or not asset_id:
            raise ValidationError({f"{path}.asset_id": ["A media asset id is required for source=media."]})
    else:
        url = value.get("url")
        if not isinstance(url, str) or not url:
            raise ValidationError({f"{path}.url": ["A URL is required for source=external."]})
        _validate_url(url, f"{path}.url")
    extra = set(value) - {"source", "asset_id", "url", "alt"}
    if extra:
        raise ValidationError({path: [f"Unknown image fields: {sorted(extra)}."]})


def _validate_prop(spec: dict, value, path: str, *, depth: int = 0) -> None:
    if depth > _MAX_PROP_DEPTH:
        raise ValidationError({path: ["Prop nesting is too deep."]})
    prop_type = spec.get("type", "string")
    if prop_type == "string":
        if not isinstance(value, str):
            raise ValidationError({path: ["Must be a string."]})
        max_length = spec.get("max_length")
        if max_length and len(value) > max_length:
            raise ValidationError({path: [f"Must be at most {max_length} characters."]})
        enum = spec.get("enum")
        if enum and value not in enum:
            raise ValidationError({path: [f"Must be one of {enum}."]})
    elif prop_type == "url":
        _validate_url(value, path)
    elif prop_type == "int":
        if not isinstance(value, int) or isinstance(value, bool):
            raise ValidationError({path: ["Must be an integer."]})
    elif prop_type == "bool":
        if not isinstance(value, bool):
            raise ValidationError({path: ["Must be a boolean."]})
    elif prop_type == "image":
        _validate_image(value, path)
    elif prop_type == "object":
        validate_props(value, {"props": spec.get("properties", {})}, path=path, depth=depth + 1)
    elif prop_type == "list":
        if not isinstance(value, list):
            raise ValidationError({path: ["Must be a list."]})
        item_type = spec.get("item_type", "string")
        max_items = spec.get("max_items")
        if max_items and len(value) > max_items:
            raise ValidationError({path: [f"Must have at most {max_items} items."]})
        if item_type == "object":
            item_schema = spec.get("item_schema")
            if not isinstance(item_schema, dict) or "properties" not in item_schema:
                raise ValidationError({path: ["A list of objects must declare item_schema.properties."]})
            for i, item in enumerate(value):
                validate_props(item, {"props": item_schema["properties"]}, path=f"{path}[{i}]", depth=depth + 1)
        elif item_type in _SCALAR_TYPES or item_type == "image":
            for i, item in enumerate(value):
                _validate_prop({"type": item_type}, item, f"{path}[{i}]", depth=depth + 1)
        else:
            raise ValidationError({path: [f"Unsupported list item_type {item_type!r}."]})
    else:
        raise ValidationError({path: [f"Unsupported prop type {prop_type!r} in block type schema."]})


def validate_props(props, schema: dict, *, path: str, depth: int = 0) -> None:
    if not isinstance(props, dict):
        raise ValidationError({path: ["Must be an object."]})
    declared = schema.get("props", {})
    for name, spec in declared.items():
        if spec.get("required") and name not in props:
            raise ValidationError({f"{path}.{name}": ["This prop is required."]})
    for name, value in props.items():
        spec = declared.get(name)
        if spec is None:
            raise ValidationError({f"{path}.{name}": ["Unknown prop for this block type."]})
        _validate_prop(spec, value, f"{path}.{name}", depth=depth)


def validate_blocks_document(document: dict, block_types_by_key: dict) -> None:
    """
    `block_types_by_key`: {key: ContentBlockType} for all active types.
    Raises `rest_framework.exceptions.ValidationError` on any violation.
    """
    if not isinstance(document, dict):
        raise ValidationError({"blocks": ["Document must be an object."]})
    if document.get("schema_version") != 1:
        raise ValidationError({"schema_version": ["Only schema_version 1 is supported."]})
    blocks = document.get("blocks")
    if not isinstance(blocks, list):
        raise ValidationError({"blocks": ["Must be a list."]})
    for i, block in enumerate(blocks):
        _validate_block(block, block_types_by_key, path=f"blocks[{i}]", parent_key=None, depth=0)


def _validate_block(block, block_types_by_key: dict, *, path: str, parent_key: str | None, depth: int) -> None:
    if depth > _MAX_BLOCK_DEPTH:
        raise ValidationError({path: ["Block nesting is too deep."]})
    if not isinstance(block, dict):
        raise ValidationError({path: ["Each block must be an object."]})
    block_id, block_type = block.get("id"), block.get("type")
    if not isinstance(block_id, str) or not block_id:
        raise ValidationError({f"{path}.id": ["A non-empty string id is required."]})
    if not isinstance(block_type, str):
        raise ValidationError({f"{path}.type": ["A block type is required."]})
    block_def = block_types_by_key.get(block_type)
    if block_def is None or not block_def.is_active:
        raise ValidationError({f"{path}.type": [f"Unknown or inactive block type {block_type!r}."]})
    allowed_parents = block_def.allowed_parent_keys or []
    if allowed_parents and parent_key not in allowed_parents:
        raise ValidationError({f"{path}.type": [f"{block_type!r} cannot be nested under {parent_key!r}."]})
    validate_props(block.get("props", {}), block_def.json_schema, path=f"{path}.props")
    children = block.get("children", [])
    if not isinstance(children, list):
        raise ValidationError({f"{path}.children": ["Must be a list."]})
    for i, child in enumerate(children):
        _validate_block(child, block_types_by_key, path=f"{path}.children[{i}]", parent_key=block_type, depth=depth + 1)


def iter_image_props(document: dict, block_types_by_key: dict):
    """
    Yield `(path, image_value)` for every prop of declared type `image`
    actually present in the document, walking both top-level block props
    and nested object/list-of-object props (so an image nested inside a
    card_grid's cards is found too). Used by the publish-time accessibility
    gate (`apps.content.workflow.publish`) — kept separate from
    `validate_blocks_document` because accessibility completeness is a
    *publish* rule, not a *save* rule (docs/25 "Image props").
    """
    blocks = document.get("blocks", []) if isinstance(document, dict) else []
    for i, block in enumerate(blocks):
        yield from _iter_block_images(block, block_types_by_key, path=f"blocks[{i}]")


def _iter_block_images(block, block_types_by_key: dict, *, path: str):
    if not isinstance(block, dict):
        return
    block_def = block_types_by_key.get(block.get("type"))
    if block_def is not None:
        yield from _iter_props_images(block.get("props", {}), block_def.json_schema.get("props", {}), path=f"{path}.props")
    for i, child in enumerate(block.get("children", []) or []):
        yield from _iter_block_images(child, block_types_by_key, path=f"{path}.children[{i}]")


def _iter_props_images(props, declared: dict, *, path: str):
    if not isinstance(props, dict):
        return
    for name, spec in declared.items():
        if name not in props:
            continue
        value, prop_path = props[name], f"{path}.{name}"
        prop_type = spec.get("type", "string")
        if prop_type == "image":
            yield prop_path, value
        elif prop_type == "object":
            yield from _iter_props_images(value, spec.get("properties", {}), path=prop_path)
        elif prop_type == "list" and isinstance(value, list):
            if spec.get("item_type") == "image":
                for i, item in enumerate(value):
                    yield f"{prop_path}[{i}]", item
            elif spec.get("item_type") == "object":
                item_props = spec.get("item_schema", {}).get("properties", {})
                for i, item in enumerate(value):
                    yield from _iter_props_images(item, item_props, path=f"{prop_path}[{i}]")


def validate_image_accessibility(document: dict, block_types_by_key: dict) -> None:
    """
    Publish-time accessibility gate (task §4, §28 in the original brief:
    "Do not allow an image to be published without appropriate alt-text
    handling"). Not run at draft-save time — an editor must be able to save
    a draft with a picked image before writing the caption; it is enforced
    only in `apps.content.workflow.publish`.

    Every `image` prop must resolve to non-empty alt text:
      - source=external: the block's own `alt` must be non-empty (there is
        no other source of truth for an externally hosted image).
      - source=media: the block's own `alt` (an override), OR the
        referenced `MediaAsset.alt_text`, must be non-empty. The asset must
        also actually exist — a dangling `asset_id` fails publish, not
        just accessibility, since it would 404 at render time.

    This module deliberately does not model "decorative" images (alt=""
    intentionally) — nothing in the current site content or spec asked for
    that distinction, and inventing it silently would mean an empty alt
    could slip through unreviewed. If decorative images are wanted, that
    needs its own explicit `decorative: true` field and a product decision,
    not an implicit default here.
    """
    from .models import MediaAsset

    images = list(iter_image_props(document, block_types_by_key))
    asset_ids = {img.get("asset_id") for _, img in images if isinstance(img, dict) and img.get("source") == "media"}
    asset_ids.discard(None)
    assets = {str(a.id): a for a in MediaAsset.objects.filter(id__in=asset_ids)} if asset_ids else {}

    errors: dict[str, list[str]] = {}
    for path, image in images:
        if not isinstance(image, dict):
            continue  # already rejected by validate_blocks_document; nothing to check here
        own_alt = (image.get("alt") or "").strip()
        if image.get("source") == "external":
            if not own_alt:
                errors[f"{path}.alt"] = ["Alternative text is required before this image can be published."]
            continue
        asset = assets.get(image.get("asset_id"))
        if asset is None:
            errors[f"{path}.asset_id"] = ["This media asset no longer exists."]
        elif not own_alt and not (asset.alt_text or "").strip():
            errors[f"{path}.alt"] = ["Alternative text is required before this image can be published."]
    if errors:
        raise ValidationError(errors)
