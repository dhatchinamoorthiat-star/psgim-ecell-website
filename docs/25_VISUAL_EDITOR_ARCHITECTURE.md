# 25 — Visual Editor Architecture

- **Date:** 2026-09-28 (revised four times same day — Phase 2A gate-review
  remediation; Phase 2B shared renderer + representative migration;
  Phase 2B completion pass — full-site migration, media resolution,
  Pending<T>, real Events/Blogs content; Phase 2C — visual editor)
- **Status:** Phase 2A **IMPLEMENTED**; Phase 2B **IMPLEMENTED AND
  COMPLETE** (16 of 18 public routes migrated, remaining 2 classified
  non-CMS — see `docs/22_MIGRATION_MATRIX.md`); Phase 2C **IMPLEMENTED**
  (visual editor: canvas, selection, layers, schema-driven inspector,
  add/duplicate/delete/reorder, media picker, undo/redo, autosave, local
  recovery, optimistic concurrency with a real conflict UI, preview mode —
  see "Phase 2C — Visual editor" below); Phases 2D–2E **NOT BUILT** (see
  phased plan below)
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
`FacultyMember`/`TeamRole`/NEC-team person shape in `team.data.ts`; `name`
is not required, matching real rows where a role is defined but not yet
filled), `cta`, and `dynamic_query` (Phase 2B — see "Dynamic content"
below). All structured list props use `list` + `item_type: "object"` +
`item_schema` instead of bare-string lists, so every field these types are
named for is actually representable. Seeded via `manage.py
seed_content_block_types` (idempotent, mirrors `seed_rbac`); 10 types as of
Phase 2B (9 registered with an Angular component — see "Shared renderer
invariant" — plus `section_heading`, catalogued but not yet given its own
component).

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

## Media reference resolution — implemented (Phase 2B completion pass)

`source: "media"` values are resolved server-side before they ever reach
Angular:

```text
MediaAsset (uploaded, scoped)
    -> block image prop {"source": "media", "asset_id": "<uuid>"}
    -> published ContentVersion.blocks (stored as authored, unresolved)
    -> apps.content.media_resolution.resolve_blocks_media()
    -> {"source": "media", "asset_id": ..., "url": <delivery_url>, "alt": <resolved alt>, "width": ..., "height": ...}
    -> PublicContentDetailView response
    -> BlockImageComponent renders <img [src]="url">
```

`PublicContentDetailView.get()` calls `resolve_blocks_media` on
`item.published_version.blocks` before returning — walking the document via
the same `iter_image_props` helper the accessibility gate already uses
(`apps/content/validation.py`), so every `image` prop is found regardless
of nesting depth. A dangling/deleted `asset_id` resolves to `None` (the
prop is dropped), which `BlockImageComponent` already renders as "no
image" rather than a broken `<img>` request — no code path exists that
could 404 or 500 on a stale reference. `source: "external"` values pass
through byte-for-byte unchanged; the function never mutates its input
(deep-copies first), so the stored, authored document is untouched.

**No new authorization surface.** `MediaAsset` upload/listing scope
(`apps.content.views`, media authorization) still governs who can *attach*
an asset to a document. Resolution only ever runs on a `ContentItem`'s
`published_version` — a document that is, by definition, already public —
so whatever media it references is exactly as public as the rest of that
page's content, the same as any other published field. Draft content is
never reachable through `PublicContentDetailView` at all (unchanged from
Phase 2A), so its media references, resolved or not, never leave the
server. No Cloudinary credential or client-controlled URL is involved
anywhere in this path — `resolve_blocks_media` only ever reads
`MediaAsset.delivery_url`, a value the server itself wrote when the asset
was uploaded (`apps.content.media`).

`BlockImageComponent`, `BlockGalleryComponent`, and `BlockTeamGridComponent`
were updated to render from a resolved `url` regardless of `source` (they
previously special-cased `source: "external"` only, which was the actual
Phase 2A-era gap) — delegated through the one shared `BlockImageComponent`
in all three places rather than duplicating the check. Tested: 7 backend
tests (`apps/content/tests/test_media_resolution.py`) cover resolution,
alt-text override, dangling-asset fail-safe, non-mutation of the source
document, end-to-end resolution through the public API for published
content, and confirmation that a draft's media is never reachable at all.

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

## Shared renderer invariant (Phase 2B — implemented)

Built as `web/src/app/shared/blocks/`:

```text
ContentDocument.blocks
        ↓
BlockRendererComponent (block-renderer.component.ts)
        ↓  Map.get(block.type)
BLOCK_REGISTRY (block-registry.ts)
        ↓
one of 9 statically-imported Angular components (components/block-*.component.ts)
```

`BlockRendererComponent` is used by exactly one consumer today
(`CmsPageComponent`, `web/src/app/features/cms-page/`), and is architected
to be the Phase 2C editor preview's renderer too — the editor will wrap the
same `<block-renderer [blocks]="...">` around a draft document instead of a
published one; nothing about the renderer itself needs to change. There is
only one renderer implementation in the codebase.

**Safety, concretely:** `block.type` is looked up as a key in a
`ReadonlyMap<string, Type<unknown>>` built from static imports
(`block-registry.ts`) — there is no string-to-class resolution beyond a
`Map.get`, no `eval`, no `Function(...)`, no dynamic template compilation,
and an unregistered key renders nothing (dev-mode console warning only).
`NgComponentOutlet`'s `inputs` binding passes `block.props` straight into
the resolved component's typed `@Input() props`, which every block
component destructures into ordinary Angular interpolation — never
`[innerHTML]`. Verified by `block-renderer.component.spec.ts`, including a
test that a `<script>`/`onerror=` payload inside a `rich_text` paragraph
renders as literal escaped text, not a DOM element.

**Design-system reuse, not a second one:** every block component's
template reuses the site's existing CSS classes/tokens verbatim
(`.section`/`.wrap`/`.section-heading`/`.kicker`/`.card`/`.grid.grid-N`/
`.btn`/`.gallery-grid`/`.gallery-tile.ratio-*`/`.avatar-initials`/
`.stats-band`, and the existing `ui-stat-tile` component is reused
directly by `BlockStatsComponent`) — confirmed by reading the actual
legacy templates first (`home.component.html`, `gallery.component.html`,
`team.component.html`) rather than guessing. The one new primitive added,
`.sr-only` (`web/src/styles/base.css`), is a standard visually-hidden
utility, added to the canonical stylesheet, not a page-specific hack.

**9 registered block types:** `hero`, `rich_text`, `stats`, `timeline`,
`card_grid`, `gallery`, `team_grid`, `cta`, `dynamic_query`. `image` is not
a block type — it's a prop type (`{"type": "image"}`) resolved by the
shared `BlockImageComponent`, used inside `hero`/`gallery`/`team_grid`.
`section_heading` (a Phase 2A catalogue entry) has no dedicated component
yet — every other block already renders its own optional heading, and no
Phase 2B page needs a bare standalone heading block.

## Responsive model

Per-block editor-controlled responsive overrides (e.g. `card_grid.columns`
varying by breakpoint) are still **not built** — that remains a Phase 2C
editor concern; the schema format already supports adding a `responsive`
prop-group per type without a breaking change.

Responsive *parity* with the legacy pages, however, is a direct consequence
of block-component reuse, not a separate thing to build: every block
component's template uses the exact same CSS classes
(`.grid.grid-2`/`.grid.grid-3`, `.stats-band`, `.gallery-grid`, `.card`)
that the legacy pages use, and those classes' breakpoint behavior lives in
`web/src/styles/layout.css`/`sections.css` — untouched by this phase. A
`card_grid` block therefore reflows at the same breakpoints as the legacy
`home.component.html` "what happens" grid, by construction, without any
block-specific responsive code. This was not independently verified with a
real-device/viewport testing tool in this phase (no such tool was
available); it is a structural guarantee from shared-CSS reuse, and should
be spot-checked visually before any of these 5 pages is treated as a full
replacement for its legacy route.

## Global elements

Not modeled as blocks — see `docs/22_MIGRATION_MATRIX.md` "Global elements
(nav, footer, notice banner) — not part of this migration" for the
reasoning and what's deferred to Phase 2C/2D.

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

## Dynamic content — implemented (Phase 2B)

Built as designed in the Phase 2A remediation, with one simplification: no
per-query `filters` object exists yet (neither Events nor Blogs needed one
to prove the mechanism) — `query`/`sort`/`limit` are implemented exactly as
designed; `filters` is deferred until a concrete need names what should be
filterable, rather than building an unused allowlist now.

```json
{"id": "recent-events", "type": "dynamic_query", "props": {
  "query": "published_events_upcoming",
  "sort": "starts_at_asc",
  "limit": 6,
  "empty_label": "No upcoming events right now."
}}
```

- **`apps.content.dynamic_queries.QUERY_REGISTRY`** (backend) is the
  allowlist: `published_events_upcoming`, `published_events_past`,
  `published_blogs`, each a `DynamicQuery` with its own `allowed_sorts`
  tuple and `max_limit`. `resolve(query_id, sort, limit)` is the only
  function that ever runs a query; an unknown `query_id` raises `NotFound`
  (404, not a 500 or a silent empty result — this is an allowlist, not a
  generic query API with an error path), an out-of-range `sort`/`limit`
  raises `ValidationError` (400). Events is split into two identifiers
  (upcoming/past) rather than one query with a client-supplied "when"
  filter, replicating `events.data.ts`'s `splitEvents()` exactly: the
  effective end (`ends_at` if set, else `starts_at`) compared to `now()`.
- **`GET /api/v1/content/public/dynamic/<query_id>`**
  (`PublicDynamicQueryView`) is the only HTTP entry point, unauthenticated,
  `public = True`. All three resolvers filter on
  `published_version__isnull=False` only — draft/unpublished
  `EventDetail`/`BlogDetail` rows are structurally unreachable through this
  endpoint, same invariant as `PublicContentDetailView`.
- **`BlockDynamicQueryComponent`** (Angular) calls
  `ContentApiService.getDynamic(props.query, {sort, limit})` — it passes
  through exactly the identifier and options already validated when the
  document was saved; it does not and cannot construct a different query.
  Rendering branches on `props.query`, reusing `.events-list`/`.event-row`/
  `.meta` for both events queries and blogs (blogs use the same row layout
  as the legacy `blogs.component.html`, including the title-as-external-link
  and inline author byline — not the `.grid`/`.card` layout an earlier
  draft of this component used, which didn't match the real legacy markup).
- **Caching / SSR reality (revised from the 2A design note):** the
  original design assumed prerender-time resolution keeps this out of the
  public runtime request path. In practice, the only route that currently
  renders any block (including `dynamic_query`) is the Phase 2B cutover
  route (`/content/**`), which is **`RenderMode.Server`** (SSR per
  request), not build-time `Prerender` — see "SSR/prerender behavior"
  below. So today a `dynamic_query` block *is* resolved on each request to
  that route, same as the rest of its document. Once Phase 2E wires actual
  published pages into the prerender pipeline, resolution genuinely moves
  to build time as originally designed; this note exists so the two
  documents don't quietly disagree about when it happens right now.
- **Not built:** an authenticated/preview-scoped variant (draft-content
  dynamic listings) — out of scope until Phase 2C's editor preview needs
  it, per the original design note.

## SSR/prerender behavior

The public site's existing 17 routes are **untouched** — still
`RenderMode.Prerender` (build-time static HTML, `app.routes.server.ts`
`'**'` wildcard, unchanged), still importing `*.data.ts` directly, still
producing the same prerendered output (verified: `ng build` before and
after this phase both report "Prerendered 18 static routes"; the new CMS
route does not appear in that count or in `dist/web/browser/`, confirming
it correctly stayed out of the prerender pass).

The new `/content/:contentType/:slug` cutover route is `RenderMode.Server`
— server-rendered per request (`app.routes.server.ts`), not prerendered.
This was a deliberate choice, not an oversight: build-time prerendering of
CMS-backed content requires the Django backend reachable during `ng
build`, which is real build/deploy-pipeline wiring appropriately deferred
to Phase 2E, not something to smuggle into Phase 2B's build config. SSR
was verified directly (not just unit-tested): with the Django dev server
and `ng serve` both running, `curl http://localhost:4200/content/page/home`
returns real backend-sourced HTML — `<h1>Creating founders on campus</h1>`
present in the raw server response, before any browser JS runs — proving
the fetch-and-render pipeline is genuinely server-side, not a client-only
fetch disguised by SSR shell HTML. A nonexistent slug
(`/content/page/does-not-exist`) correctly server-renders the "Not found"
state rather than leaking an error page or empty shell. `HttpClient` is
configured with `withFetch()` (`app.config.ts`), which uses the platform
fetch API identically in Node (SSR) and the browser — no browser-only API
(`window`, `document`, `localStorage`, etc.) is used anywhere in the
renderer or its block components; confirmed by code review of every
`components/block-*.component.ts` file, none of which reference any such
global.

**Not verified:** production SSR (`npm run serve:ssr:web`) against a
reverse-proxied backend the way Cloudflare would front it in production —
`web/src/server.ts` has no `/api` proxy today (by design; that role
belongs to the Cloudflare Pages Function in production, per ADR-004), so
exercising that exact topology locally would mean modifying deployment
plumbing, which is out of scope here. The `ng serve` + proxy.conf.json
verification above exercises the identical Angular-side SSR/fetch code
path; only the reverse-proxy hop is untested locally.

## Migration impact

Phase 2A touched no existing Angular file. **Phase 2B also touches no
existing route, component, or `*.data.ts` file** — every one of the 18
legacy routes still renders exactly as before (verified: `ng build`
reports the same prerendered route count before and after this phase).
Migration is purely additive: new files under `web/src/app/shared/blocks/`,
`web/src/app/features/cms-page/`, `web/src/app/core/services/
content-api.service.ts`, one new route, one new CSS utility class, the
backend `legacy_migration.py`/`migrate_legacy_content` management command,
and `media_resolution.py`. See `docs/22_MIGRATION_MATRIX.md` "Phase 2B —
Public Angular route migration status (completion pass)" for the full
per-route classification and parity table — **16 of 18 routes now have a
CMS-backed equivalent**; the remaining 2 (`/contact`, `/control`) are
classified `GLOBAL_SYSTEM`/`NON_CMS_SYSTEM` with a documented reason, not
left "not started."

## Phase 2C — Visual editor

Built at `web/src/app/platform/editor/`, behind `/platform/editor/:contentType/:slug`
(`authGuard` + `permissionGuard('content.view')`, same pattern as every
other `/platform` screen — UX-in-depth only, the API enforces).

### Editor routing and RBAC

`EditorPageComponent.ngOnInit` resolves `(contentType, slug) ->
GET /content/by-slug/<type>/<slug>` (new: `ContentItemBySlugView`,
scope-checked exactly like the existing by-id lookup — 404, not a leak,
outside scope), then opens `draft_version_id` if one exists, else calls
`POST /content/versions/<published_id>/new-draft` to start one. Both the
lookup and every subsequent read/write go through the same
`apps.rbac.policy` checks every other content endpoint already used — no
new authorization code path was introduced. The editor deliberately uses
`content.submit` (not a new `content.edit` permission) for mutation, same
permission `PATCH` already required in Phase 2A — introducing a parallel
permission with no concrete forcing requirement would fragment the RBAC
model for no benefit; `content.view` gates read/route access as the task
specified.

### Document state model

`EditorDocumentService` (route-scoped, not `providedIn: 'root'` — two open
editor tabs never share state): `blocks` (the working document, a plain
signal), `selectedId`/`hoveredId`, and a bounded (`MAX_HISTORY = 50`)
undo/redo stack of **immutable snapshots** of the whole `blocks` array —
not DOM state, not a diff/patch format. `structuredClone` on every
mutation keeps this cheap and trivially correct at this document size.
`isDirty()` is a structural comparison against a `baselineBlocks` signal
set on `load()`/`markSaved()`.

Block ids are assigned once, at creation/duplication
(`block_<12 random hex chars>`), and never regenerated — `addBlock`,
`duplicateBlock`, undo, redo, and autosave all preserve them, satisfying
task §4 ("IDs survive reorder/duplication/autosave... not random IDs that
change every render").

### Selection model

`selectedId`/`hoveredId` are plain signals, read by three places that all
agree because there is exactly one source of truth: the layers panel
(`EditorLayersComponent`), the canvas overlay (via `BlockEditorHost`,
below), and the inspector (`selectedBlock` computed signal). No DOM node is
ever stored as application state.

### Block registry integration — the shared renderer, extended, not replaced

`BlockRendererComponent` gained one new optional input,
`editorHost?: BlockEditorHost`
(`web/src/app/shared/blocks/block-editor-host.ts`):

```ts
interface BlockEditorHost {
  selectedId(): string | null;
  hoveredId(): string | null;
  select(id: string): void;
  hover(id: string | null): void;
  duplicate?(id: string): void;
  remove?(id: string): void;
  moveUp?(id: string): void;
  moveDown?(id: string): void;
}
```

When `editorHost` is present, each top-level block renders inside a
`.be-block` wrapper (selection outline, hover state, a small contextual
action bar for whichever of duplicate/remove/moveUp/moveDown the host
actually provides). When absent — **every public render, always** — the
template emits the bare `ngComponentOutlet` with zero extra DOM. This is
the literal mechanism behind "EDITOR OVERLAY ≠ PUBLIC CONTENT": it isn't a
policy note, it's `@if (editorHost) { ... } @else { ... }` in one template,
verified by a passing test (`renders no editor chrome at all when
editorHost is absent`) and by live inspection of `/content/page/home` vs.
the editor canvas. `EditorCanvasComponent` is the only place that
constructs an `editorHost` object, delegating every method straight to
`EditorDocumentService`.

There is still exactly one renderer, one `BLOCK_REGISTRY`, one place
`block.type` is ever looked up as a `Map` key. Nothing new introduces
`eval`, `Function(...)`, dynamic template compilation, or a CMS-supplied
component selector.

### Inspector — schema-driven, not per-block hardcoded

`EditorInspectorComponent` + `PropFieldComponent` read the selected block's
`ContentBlockType.json_schema` (fetched once from `GET /content/block-types`
— the same canonical catalogue the backend validates against, never a
second copy) and render controls accordingly: `string`/`url`/`int`/`bool`
scalars, `enum` selects, `object` and `list` (both scalar-item and
object-item, covering every real block type — `stats.items`,
`timeline.entries`, `card_grid.cards`, `gallery.images`, `team_grid.members`
are all `list[object]`) via recursive composition of `PropFieldComponent`,
and `image` via a structured `{source, asset_id|url, alt}` control that
opens the media picker for `source: "media"`. Props are split into
"Content" and "Layout" sections by a small fixed name list
(`columns`/`alignment`/`sort`/`limit`/`ratio` → Layout, everything else →
Content) — the schema doesn't yet tag a prop's category explicitly, so
this is a pragmatic grouping, not a schema feature. **There is no raw
CSS/HTML/JS field anywhere in the inspector** — every control's possible
output is exactly what the corresponding schema type already constrains.

### Add / duplicate / delete / reorder

`EditorAddBlockComponent` lists every row from the same `GET
/content/block-types` response — there is no second, hardcoded block-type
list in the editor, so a new type appearing server-side shows up in the
palette automatically and nothing here can ever offer a type the backend
would reject. New blocks get schema-valid defaults from
`defaultPropsFor()` (only *required* props get a default; every schema
already tolerates an empty list for its list props, so "safe defaults"
means "the minimum that passes validation," not invented content).
Duplicate deep-clones props and assigns a fresh id (task §11: "not
duplicate MediaAsset ownership records" — duplicating a block only copies
the `{source, asset_id, alt}` reference, never touches `MediaAsset` rows
themselves, so there's nothing to duplicate-own). Delete removes the block
from the working document only — `MediaAsset` rows are never deleted as a
side effect of a block referencing one going away (task §12), and version
history is untouched since this only ever mutates the current DRAFT.
Reorder: move-up/move-down buttons (keyboard/button-accessible, no
drag-and-drop dependency, per task §27) plus `EditorDocumentService.reorder`
for index-based moves.

### Media library

`EditorMediaPickerComponent` lists `GET /content/media` (scoped
server-side by `_visible_media` — Phase 2A/2B's fix, unchanged: a Vertical
Head never sees another vertical's assets here) and uploads via the
existing Phase 2A signed-upload flow: `GET /content/media/upload-params`
(server-issued, short-lived Cloudinary signature) → direct browser POST to
Cloudinary → `POST /content/media` records the result. **The Cloudinary
API secret never reaches any Angular code, ever** — only a per-upload
signature does, and that signature is scoped to the folder derived from
the actor's verified vertical (Phase 2B's media-authorization fix,
unchanged). Selecting existing server-stored `alt_text` pre-fills the
image field's alt text (task §14: "use it as the initial value") while
remaining editable; picking a different image never copies alt text from
an unrelated one.

### Responsive preview

One `viewport` signal (`desktop`/`tablet`/`mobile`) drives a CSS `width`
on the canvas frame (`100%`/`48rem`/`24rem`) — the exact same
`BlockRendererComponent` output at a narrower container width, so
responsive behavior is whatever the public site's own CSS
(`layout.css`/`sections.css`) already does at that width. There is no
second, editor-specific responsive renderer.

### Undo / redo

`Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` (`@HostListener('window:keydown')`) and
toolbar buttons, both calling `EditorDocumentService.undo()`/`redo()`.
Covers every mutation path (prop edit, add, delete, duplicate, reorder,
media replacement — media replacement is just a prop edit) because they
all funnel through the same `commit()` method that pushes history.
Verified with 14 dedicated unit tests, including "a new edit after undo
clears the redo stack."

### Autosave and local recovery

Every mutation calls `scheduleAutosave()`: sets `saveStatus = 'dirty'`,
writes an immediate local-recovery snapshot
(`web/src/app/platform/editor/editor-local-recovery.ts`, keyed by `user +
content item + draft version id` — never leaks across users/items, holds
only the block document, no auth/session data), and debounces the actual
`PATCH` by 2 seconds (`AUTOSAVE_DEBOUNCE_MS`) so rapid edits coalesce into
one request rather than one per keystroke. On reopening a draft with a
mismatched local-recovery record, a banner offers **Restore**/**Discard**
— never a silent overwrite of the server draft with stale local state, and
never the reverse.

### Optimistic concurrency

`ContentVersion` gained no new field for this — `updated_at` (already
existing, already exposed by `ContentVersionSerializer`) is the revision
marker. `PATCH /content/versions/<id>` now accepts an optional
`expected_updated_at`; `workflow.update_draft` locks the row
(`select_for_update`) and re-checks *inside* the transaction (not just
against the possibly-stale in-memory object the view fetched at request
start — a genuine two-concurrent-request race would otherwise slip past an
outside-the-transaction check) before writing, raising a new `StaleVersion`
(409, `code: "stale_version"`) if the timestamps don't match. The editor
shows a dedicated conflict banner — "This draft changed elsewhere," **Reload
latest (discard my changes)** / **Keep my changes** — never a silent
overwrite either direction.

This was verified live against a real race, not just unit-tested: a second
"editor" (a Django shell session) saved a change to the same draft while
the browser held a stale `updated_at`; saving from the browser correctly
surfaced the conflict banner with the local edit still visible in the
canvas (not lost), and **the first attempt at "Keep my changes" silently
failed to actually persist** — `keepLocalAndRetry()` had reused
`EditorDocumentService.load()`, which resets the dirty baseline to match
the just-loaded content, so the retried save's `isDirty()` check returned
false and no-op'd. Fixed with a dedicated
`restoreLocalOverBaseline(serverBaseline, localBlocks)` method that sets
the baseline to the server's latest content while keeping the working
blocks as the local edit, so `isDirty()` stays true and the retry actually
sends the PATCH — re-verified live (the local edit persisted server-side,
confirmed by reading the row directly), and covered by a regression test
(`restoreLocalOverBaseline keeps the local blocks but is dirty against the
new server baseline`) describing exactly the bug it fixes.

### Preview mode

Toggling preview swaps to a chrome-free render of the current **draft**
document through the same `BlockRendererComponent`, `editorHost` omitted —
verified live: `hasEditorChrome: false`, `hasSelectionOverlay: false` in
the DOM while previewing. This is authenticated (same `/platform` session,
same RBAC), never a public URL — there is no tokenized/public preview
mechanism, and none was needed, since preview only ever runs inside the
already-authenticated editor page.

### Editor / public separation

Three distinct data paths, never conflated: the **public API**
(`GET /content/public/<type>/<slug>`) returns only `published_version`,
unauthenticated, unchanged since Phase 2A/2B. The **editor API**
(`GET/PATCH /content/versions/<id>`, `by-slug`, `new-draft`) requires
`content.view`/`content.submit` and is scope-checked per request. **Preview**
reuses the editor API and session — there is no third, separate preview
endpoint, because nothing about preview needs to be reachable outside an
authenticated editor session. A signed-in Vertical Head cannot reach
another vertical's draft through any of these paths (unchanged Phase
2A/2B scope enforcement — `ContentItemBySlugView`/`ContentVersionDetailView`
apply the identical `has_perm`/404-not-403 pattern).

### Known simplifications (honest, not hidden)

- The inspector groups "Layout" props by a fixed name list, not a schema
  field — adding a genuinely schema-driven category tag is a small,
  low-risk follow-up, not attempted here to avoid a backend schema change
  mid-editor-build.
- No drag handle exists for canvas reordering yet — move-up/move-down
  buttons satisfy the keyboard/button-alternative requirement (task §27)
  but a literal drag gesture (`EditorDocumentService.reorder` already
  supports arbitrary index moves; only the drag *input* is missing) is
  deferred.
- `platform.css`'s build-time size budget (8 KB) is now exceeded by ~3.8 KB
  after the editor's styles — a non-fatal build warning, not an error;
  trimming/splitting the CSS is a housekeeping item, not a functional gap.
- Mobile editing was not attempted beyond CSS-hiding the side panels below
  1024px (task §28 explicitly allows deprioritizing this) — the content
  preview itself still supports mobile *viewport simulation* via the
  desktop/tablet/mobile toggle, which is what §28 actually requires.

## Phased plan

| Phase | Scope | Status |
|---|---|---|
| 2A | Content model, workflow engine, block schema + registry, API (`backend/apps/content`) | **Done, gate-reviewed, remediated** (object/object_list schema, media scope enforcement, version-numbering lock, publish-time accessibility gate, approval-stage snapshot, audit completeness, own-content/approval-history read paths) |
| 2B | Angular block-renderer components, block registry, full existing-page migration, public rendering parity, media resolution | **Done and complete** — shared renderer (9 block types), `ContentApiService`, one SSR cutover route, 16/18 routes migrated (22 `ContentItem`s, idempotent), allowlisted dynamic content with real Events/Blogs data, media reference resolution, Pending<T> editorial marker, backend+frontend tests, no legacy route touched |
| 2C | Editor canvas, selection, inline text editing, media replacement, block manipulation, responsive preview, undo/redo | **Done** — see "Phase 2C — Visual editor" above; live-verified against a real backend, including a real optimistic-concurrency conflict and its fix |
| 2D | Approval/publish UI, scheduled publication UI, deployment-job abstraction (no real Cloudflare call) | Not started |
| 2E | Build/prerender/validate pipeline integration (real prerender-time content resolution for CMS-backed routes, production SSR+proxy topology) | Not started |

Each remaining phase gets its own plan and PR — see task instruction
§31/§36 ("do not implement everything in one giant change", "make logical
commits").
