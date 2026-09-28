# 25 — Visual Editor Architecture

- **Date:** 2026-09-28
- **Status:** Phase 2A **IMPLEMENTED**; Phases 2B–2E **NOT BUILT** (see phased plan below)
- **Extends:** `ADR-013-VISUAL-PAGE-BUILDER.md`, `ADR-011-CMS-CONTENT-MODEL.md`

## Block document schema

`ContentVersion.blocks`:

```json
{
  "schema_version": 1,
  "blocks": [
    {"id": "hero-1", "type": "hero", "props": {"heading": "...", "image": "..."}, "children": []}
  ]
}
```

- `id` — unique within the document (editor identity for selection/undo,
  not yet built).
- `type` — must match an active `ContentBlockType.key`.
- `props` — validated against that type's `json_schema` on every write
  (`apps/content/validation.py`), never trusted from the client alone.
- `children` — nested blocks, subject to `allowed_parent_keys` composition
  rules (Phase 2A: no block type restricts its parent, since no
  container/section type exists yet — see "Not yet built").

## Block-type registry

`ContentBlockType` rows (`backend/apps/content/models.py`) are the
controlled design system: `key`, `label`, `json_schema` (a small internal
format — see below, not full JSON Schema draft), `version`, `is_active`,
`allowed_parent_keys`. Writable only by `content_type.manage` holders
(Technical/System level, task's "Level 3" editing tier).

### Schema format

```json
{"props": {
  "heading": {"type": "string", "required": true, "max_length": 200},
  "image":   {"type": "url"},
  "items":   {"type": "list", "item_type": "string"},
  "align":   {"type": "string", "enum": ["left", "center", "right"]}
}}
```

Supported prop types: `string`, `url`, `int`, `bool`, `list`. This is
deliberately smaller than JSON Schema draft-07 — block props are flat
declarations with no need for `$ref`/`oneOf`/combinators, and avoiding a new
dependency (no `jsonschema` package) keeps the validator auditable in one
short file.

### Phase 2A block catalogue (`apps/content/block_catalogue.py`)

Derived from what the 17 existing public page components genuinely render
(`web/src/app/features/*`), not invented: `hero`, `rich_text`,
`section_heading` (maps to the existing `ui-section-heading`), `stats`
(maps to `ui-stat-tile`/`stats.data.ts`), `timeline` (maps to
`TimelineEntry`), `card_grid` (maps to the `ActionCard`/`WhatHappensContent`
pattern), `gallery`, `cta`. Seeded via `manage.py seed_content_block_types`
(idempotent, mirrors `seed_rbac`).

## Security boundary

No block type accepts raw HTML, inline scripts, or `javascript:`/`data:`
URLs. `validate_props` rejects any prop not declared in the type's schema
and any `url`-typed prop whose scheme isn't `https`/`http`/relative
(`apps/content/validation.py:_validate_url`). There is currently zero
`innerHTML`/`DomSanitizer` usage anywhere in the Angular app (confirmed by
direct search) — this schema keeps it that way. Rich text stays a bounded
string prop, not an HTML blob, until a dedicated allowlist HTML sanitizer
is deliberately introduced for a future phase.

## Shared renderer invariant (not yet built)

Editor canvas and public rendering must consume the same `blocks` document
through the same Angular block-component registry — there must never be
"editor rendering ≠ public rendering." Phase 2A ships the document format
and server-side validation only; the Angular side (block components,
registry, and the switch that makes existing pages read from CMS data
instead of `*.data.ts`) is Phase 2B.

## Responsive model (not yet built)

Each block type will eventually declare its own responsive behavior
(e.g. `card_grid.columns` per breakpoint) rather than exposing arbitrary
absolute positioning — this is a Phase 2C editor concern; the schema format
above already supports adding a `responsive` prop-group per type without a
breaking change when that phase starts.

## Versioning, preview, publishing

Unchanged from `docs/07_CONTENT_WORKFLOW.md` / `21_CMS_WORKFLOW.md` — the
visual document is just what `ContentVersion.blocks` holds; the state
machine, `ApprovalRule` resolution, and audit requirements are identical to
the generic CMS spec and are fully implemented in
`backend/apps/content/workflow.py`.

## Migration impact

No existing Angular page, component, or `*.data.ts` file is touched by
Phase 2A. The old renderer stays the only renderer in production until
Phase 2B builds the shared block-renderer and a migration adapter, and
parity is verified per-page before any cutover (per the task's "PARITY
before editing freedom" requirement).

## Phased plan

| Phase | Scope | Status |
|---|---|---|
| 2A | Content model, workflow engine, block schema + registry, API (`backend/apps/content`) | **Done** (this session) |
| 2B | Angular block-renderer components, block registry, existing-page migration adapter, public rendering parity | Not started |
| 2C | Editor canvas, selection, inline text editing, media replacement, block manipulation, responsive preview, undo/redo | Not started |
| 2D | Approval/publish UI, scheduled publication UI, deployment-job abstraction (no real Cloudflare call) | Not started |
| 2E | Build/prerender/validate pipeline integration (still no production deploy) | Not started |

Each remaining phase gets its own plan and PR — see task instruction
§31/§36 ("do not implement everything in one giant change", "make logical
commits").
