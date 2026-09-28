# 25 — Visual Editor Architecture

- **Date:** 2026-09-28 (revised same day — Phase 2A gate-review remediation)
- **Status:** Phase 2A **IMPLEMENTED**; Phases 2B–2E **NOT BUILT** (see phased plan below)
- **Extends:** `ADR-013-VISUAL-PAGE-BUILDER.md`, `ADR-011-CMS-CONTENT-MODEL.md`

> **Revision note:** an independent gate review of the first Phase 2A pass
> found the block schema below could not actually represent the site's real
> structured content (a `stats`/`timeline`/`card_grid`/`gallery` block could
> only hold a flat list of plain strings, silently dropping every field but
> one). This revision documents the fix: `object`/`object_list` prop types
> and a structured `image` type. See `PHASE_2_AUTHORIZATION.md` for the
> authorization trail — this document only records the corrected design,
> it does not itself constitute or claim any new authorization.

## Block document schema

`ContentVersion.blocks`:

```json
{
  "schema_version": 1,
  "blocks": [
    {"id": "hero-1", "type": "hero", "props": {"heading": "...", "image": {"source": "media", "asset_id": "..."}}, "children": []}
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
  "image":   {"type": "image"},
  "align":   {"type": "string", "enum": ["left", "center", "right"]},
  "featured": {
    "type": "object", "required": false,
    "properties": {
      "title": {"type": "string", "required": true, "max_length": 120},
      "body":  {"type": "string", "required": true, "max_length": 600}
    }
  },
  "items": {
    "type": "list", "item_type": "object", "required": true, "max_items": 20,
    "item_schema": {
      "properties": {
        "value": {"type": "string", "required": true},
        "label": {"type": "string", "required": true},
        "count": {"type": "int", "required": false}
      }
    }
  }
}}
```

Supported prop types: `string`, `url`, `int`, `bool`, `image`, `object`,
`list`. This is still deliberately smaller than JSON Schema draft-07 — no
`$ref`/`oneOf`/combinators, no dependency on a `jsonschema` package — but it
is now a genuinely recursive grammar:

- **`object`** — a fixed-shape nested record. The spec carries its own
  `properties: {name: spec}` (the same spec grammar, recursively). Unknown
  keys inside an object are rejected exactly like unknown top-level props.
- **`list`** — `item_type` selects what each element is: any scalar type,
  `"image"`, or `"object"` (in which case the spec must also declare
  `item_schema: {"properties": {...}}` — this is the `object_list` pattern:
  a `list` whose `item_type` is `object`, not a separate top-level type,
  so the same recursive validator handles both single objects and lists of
  them with one code path). An optional `max_items` bounds list length.
- **`image`** — see "Image props and media references" below.

Nesting is bounded independently for the block tree (`_MAX_BLOCK_DEPTH`,
children-of-children) and for props within one block (`_MAX_PROP_DEPTH`,
object-inside-object), both currently 6, so a malicious deeply-nested
document can't bypass either guard by hiding behind the other.

### Phase 2A block catalogue (`apps/content/block_catalogue.py`)

Derived from what the 17 existing public page components genuinely render
(`web/src/app/features/*`), not invented: `hero`, `rich_text`,
`section_heading` (maps to the existing `ui-section-heading`), `stats`
(maps to `ui-stat-tile`/`stats.data.ts`'s `Stat{value,label,count,suffix}`),
`timeline` (maps to `TimelineEntry{year,what}`), `card_grid` (maps to
`ActionCard{title,body}`), `gallery` (maps to
`GalleryItem{file,caption,album,ratio}`), `team_grid` (maps to the
`FacultyMember`/`TeamRole`/NEC-team person shape in `team.data.ts` — seeded
with an empty catalogue entry only, to prove the `object_list` pattern
generalizes to people records without inventing any real member data), and
`cta`. All structured list props now use `list` + `item_type: "object"` +
`item_schema` (the fix above) instead of the earlier bare-string lists, so
every field these types are named for is actually representable. Seeded via
`manage.py seed_content_block_types` (idempotent, mirrors `seed_rbac`).

## Image props and media references

Every image-bearing prop is `{"type": "image"}`, never a bare `url` string.
The stored value is one of two explicit shapes:

```json
{"source": "media", "asset_id": "<MediaAsset uuid>", "alt": "optional override"}
{"source": "external", "url": "https://...", "alt": "required for this source"}
```

`source: "media"` is the preferred path — it references a `MediaAsset` row
(`backend/apps/content/models.py`), so the asset's own `alt_text`,
dimensions, and upload provenance stay attached to what's actually
rendered, closing the gap the gate review found (a bare image URL had no
connection to the `alt_text` captured at upload time). `source: "external"`
is preserved deliberately — the current architecture has always allowed
externally hosted URLs (the URL allowlist in `validate_props` exists
precisely for this), and forcing every image through a `MediaAsset` would
be a real, unrequested narrowing of what editors can do. An external image
carries its own `alt` inline since there is no asset row to fall back to.

**Accessibility gate — publish-time, not save-time.** An editor may save a
draft with an image picked and no caption written yet; `update_draft`/
`create_draft` only check the *shape* of the `image` value (valid
source, presence of `asset_id`/`url`). `apps.content.workflow.publish`
additionally calls `validate_image_accessibility`
(`apps/content/validation.py`), which walks every `image` prop in the
document (including ones nested inside `object`/`list` props, e.g. a
`gallery` item's `image`) and requires non-empty alt text: the block's own
`alt` for `source: external`; the block's own `alt` **or** the referenced
`MediaAsset.alt_text` for `source: media`. A dangling `asset_id` (the
`MediaAsset` no longer exists) also fails publish, not just accessibility —
it would 404 at render time otherwise. Publishing returns a normal 400
validation error naming the exact block/prop path that's missing alt text.

**No decorative-image distinction exists.** The gate review's brief was
explicit that this must not be silently invented, and nothing in the
current site content or any prior spec calls for it — every image is
therefore treated as meaningful content requiring alt text. If a genuine
decorative-image use case shows up later, it needs its own explicit
`decorative: true` field and a product decision, not a quiet default added
to this validator.

## Security boundary

No block type accepts raw HTML, inline scripts, or `javascript:`/`data:`
URLs, at any nesting depth — `_validate_url` is applied uniformly whether a
`url`/`image` prop is top-level, inside an `object`, or inside a `list` of
objects, and unknown properties are rejected the same way at every nesting
level (`apps/content/validation.py`). There is currently zero
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

`ContentVersion.approval_stages_snapshot` implements doc 07's Invariant 5
("rules are evaluated at submit time and stored on the submission"):
`workflow.submit()` resolves the active `ApprovalRule` set once and freezes
it onto the version; `workflow.approve()` reads that snapshot, never a live
`ApprovalRule` query. A rule added or changed while a version is
`IN_REVIEW` therefore cannot silently change what that specific version
still needs — only versions submitted after the change pick up the new
requirement. This is the mechanism only; no production `ApprovalRule` or
`FACULTY_ADVISOR` assignment is seeded by it (N-3/N-4 remain open, see
`PHASE_2_AUTHORIZATION.md`).

## Content read paths and approval visibility

Two endpoints exist specifically because an own_only `content.submit`
holder (e.g. `MEMBER`, per `apps/rbac/catalogue.py`) may hold no
`content.view` grant anywhere, and previously had no way to read even a
draft they authored themselves:

- `GET /api/v1/content/mine` — every version authored by the caller,
  regardless of scope. Author identity is the only filter; this never
  reveals another user's drafts.
- `GET /api/v1/content/versions/<id>` — its object-level check now accepts
  either `content.view` at the version's scope **or** the caller being the
  version's own author; `PATCH` was already own_only-correct, only `GET`
  had the gap.
- `GET /api/v1/content/versions/<id>/approvals` — read-only approval trail
  (stage, approver, decision, comment, timestamp), scoped identically to
  the version itself (own-authored, or `content.view` at scope). Previously
  the serializer existed with no endpoint exposing it at all.

## Media authorization

`MediaAsset` listing, creation, and Cloudinary upload-param issuance are
all scoped through the same RBAC pattern as content items — a gate review
of the first Phase 2A pass found none of the three actually enforced it:

- **Listing** (`GET /api/v1/content/media`) is filtered by
  `scopes_for(request.user, content.view)`, exactly like content-item
  listing — a vertically-scoped viewer never sees another vertical's media.
- **Creation** (`POST /api/v1/content/media`) verifies `media.upload` at
  the *claimed* `owner_vertical_id`'s scope before creating anything — a
  client can no longer forge ownership of another vertical's media by
  editing the request body.
- **Cloudinary folder** (`GET /api/v1/content/media/upload-params`) no
  longer accepts a client-supplied `folder`; the folder is derived from a
  verified `owner_vertical_id` (`apps/content/media.py:folder_for_scope`)
  after the same `media.upload`-at-scope check, so an upload can't be
  aimed at an arbitrary or another vertical's folder.

## Version-numbering concurrency

`ContentVersion.number` is assigned by `workflow.create_draft`, which now
locks the parent `ContentItem` row (`select_for_update()`) before computing
`max(number) + 1`, inside the existing `transaction.atomic()` block. Two
concurrent calls against the same item (double-submit, two tabs, a future
autosave race) serialize on that lock instead of racing to the same number
and hitting `unique_version_number_per_item` as an unhandled error. `revert`
and the "new draft from an old version" endpoint both call `create_draft`
internally, so the fix covers every version-creating path with one change.

## Dynamic content (design only — not implemented in Phase 2A)

The gate review found that Events and Blogs listing pages (and similar
"show N recently published items of a type" pages) cannot be represented
by the static-props block model above — every current block type holds
values the editor explicitly set, never a live query result. This section
records the smallest viable design for Phase 2B to build against; **no
code for it exists yet**, and none of the block types seeded in Phase 2A
declare this type.

### `dynamic_query` block (proposed shape, not seeded)

```json
{"id": "recent-events", "type": "dynamic_query", "props": {
  "query": "published_events",
  "filters": {"content_type": "event"},
  "sort": "starts_at_desc",
  "limit": 6
}}
```

- **`query`** — one of a fixed, server-defined allowlist of identifiers,
  e.g. `published_events`, `published_blogs`. Never a free string
  interpreted as SQL, an ORM expression, or any executable code — each
  identifier maps to one hand-written, reviewed query function in Django
  (the same trust posture as `apps.content.views.PublicContentDetailView`:
  the server decides what's queryable, the document only selects among
  pre-approved options).
- **`filters`** — a small, per-query allowlisted set of fields (e.g.
  `owner_vertical`, `content_type` sub-kind), validated the same way a
  block's other props are (`validate_props` against a declared schema
  specific to each `query` identifier) — not an arbitrary filter DSL.
- **`sort`** — an enum of pre-defined orderings per query (e.g.
  `starts_at_desc`, `published_at_desc`), not an arbitrary field+direction
  pair, so no query can be coerced into sorting by an unindexed or
  sensitive column.
- **`limit`** — bounded (e.g. max 24) to keep the public endpoint's
  response size and query cost predictable.
- **Public rendering behavior** — resolved server-side at read time by the
  public content endpoint (`PublicContentDetailView`'s eventual 2B
  successor), never client-side and never at authoring/draft time; a draft
  previewing a `dynamic_query` block would need its own preview-time
  resolution path that still only reads *published* items unless the
  previewer holds `content.view` (matching the existing published-content
  isolation invariant — a dynamic block must not become a side channel for
  draft/unpublished content).
- **Authorization model** — the query functions themselves only ever touch
  published content for anonymous/public rendering; an authenticated
  preview context would pass the requester through so scope-filtered
  results are possible later, but Phase 2A/2B need only the public case.
- **Caching implications** — because the public site stays static
  prerendered (ADR-002, unchanged), a `dynamic_query` block's result is
  resolved once at *build/prerender* time, not per-visitor-request — it is
  not a runtime API dependency for the public page. This preserves the
  "no runtime dependency for public rendering" invariant already committed
  to in `docs/20_CMS_CONTENT_MODEL.md`.

**Why this is stopped here rather than implemented:** the query allowlist,
per-query filter schemas, and the preview-time draft-isolation rule above
are exactly the kind of concrete, reviewable design decisions this
remediation pass should surface, not silently build past. Implementing it
belongs in Phase 2B, alongside the renderer component that would actually
consume its output — building the backend half alone here would commit to
an API shape before the consuming side exists to validate it against.

## Migration impact

No existing Angular page, component, or `*.data.ts` file is touched by
Phase 2A. The old renderer stays the only renderer in production until
Phase 2B builds the shared block-renderer and a migration adapter, and
parity is verified per-page before any cutover (per the task's "PARITY
before editing freedom" requirement). The object/object_list schema fix
above is a prerequisite for that migration to be lossless — the earlier
bare-string-list schema could not have represented `stats.data.ts`,
`nec.data.ts`'s tracks/incentives, `team.data.ts`, or `gallery.data.ts`
without dropping fields.

## Phased plan

| Phase | Scope | Status |
|---|---|---|
| 2A | Content model, workflow engine, block schema + registry, API (`backend/apps/content`) | **Done, gate-reviewed, remediated** (object/object_list schema, media scope enforcement, version-numbering lock, publish-time accessibility gate, approval-stage snapshot, audit completeness, own-content/approval-history read paths) |
| 2B | Angular block-renderer components, block registry, existing-page migration adapter, public rendering parity | Not started |
| 2C | Editor canvas, selection, inline text editing, media replacement, block manipulation, responsive preview, undo/redo | Not started |
| 2D | Approval/publish UI, scheduled publication UI, deployment-job abstraction (no real Cloudflare call) | Not started |
| 2E | Build/prerender/validate pipeline integration (still no production deploy) | Not started |

Each remaining phase gets its own plan and PR — see task instruction
§31/§36 ("do not implement everything in one giant change", "make logical
commits").
