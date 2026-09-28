"""
Server-side validation of `ContentVersion.blocks` documents
(docs/25_VISUAL_EDITOR_ARCHITECTURE.md, task security boundary: never trust
client-side validation alone).

`ContentBlockType.json_schema` uses a small internal format rather than full
JSON Schema draft-07, because block props are flat declarations
(name -> type/required/constraints) with no need for draft-07's
combinators/refs:

    {"props": {
        "heading": {"type": "string", "required": true, "max_length": 200},
        "image":   {"type": "url", "required": false},
        "items":   {"type": "list", "item_type": "string"},
        "align":   {"type": "string", "enum": ["left", "center", "right"]}
    }}

Supported prop types: string, url, int, bool, list.
"""

from urllib.parse import urlparse

from rest_framework.exceptions import ValidationError

_ALLOWED_URL_SCHEMES = {"https", "http"}  # http allowed for local dev media only
_MAX_BLOCK_DEPTH = 6


def _validate_url(value: str, path: str) -> None:
    if not isinstance(value, str):
        raise ValidationError({path: ["Must be a string URL."]})
    if value.startswith("/"):
        return  # relative path — safe
    parsed = urlparse(value)
    if parsed.scheme not in _ALLOWED_URL_SCHEMES:
        raise ValidationError({path: [f"URL scheme {parsed.scheme!r} is not allowed."]})


def _validate_prop(name: str, spec: dict, value, path: str) -> None:
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
    elif prop_type == "list":
        if not isinstance(value, list):
            raise ValidationError({path: ["Must be a list."]})
        item_type = spec.get("item_type", "string")
        for i, item in enumerate(value):
            _validate_prop(name, {"type": item_type}, item, f"{path}[{i}]")
    else:
        raise ValidationError({path: [f"Unsupported prop type {prop_type!r} in block type schema."]})


def validate_props(props: dict, schema: dict, *, path: str) -> None:
    if not isinstance(props, dict):
        raise ValidationError({path: ["props must be an object."]})
    declared = schema.get("props", {})
    for name, spec in declared.items():
        if spec.get("required") and name not in props:
            raise ValidationError({f"{path}.{name}": ["This prop is required."]})
    for name, value in props.items():
        spec = declared.get(name)
        if spec is None:
            raise ValidationError({f"{path}.{name}": ["Unknown prop for this block type."]})
        _validate_prop(name, spec, value, f"{path}.{name}")


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
