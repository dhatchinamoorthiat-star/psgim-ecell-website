# ADR-011 — CMS Content Model: Typed Subclasses over Generic JSON

- **Status:** **ACCEPTED** — 2026-09-28 (session override recorded in
  `PHASE_2_AUTHORIZATION.md` "Override record"; originally proposed
  2026-09-27). Extended by `ADR-013-VISUAL-PAGE-BUILDER.md` for the visual
  block editor built on top of this content model.
- **Found during:** Phase 1→Phase 2 readiness audit
- **Kind:** resolves an internal inconsistency in a proposed (not yet
  implemented) document; recommends a specific engineering direction for
  human ratification. It is not a redesign of anything already built —
  no CMS models exist in code yet (`backend/apps/rbac/approvals.py`:
  "content arrives in Phase 2").

## Context

`05_DATA_MODEL.md` (marked "proposed") specifies `ContentItem` with a `type`
enum and a `data JSONB` field "validated by the type's schema" — a generic,
JSON-typed shape (Option A). The same document separately specifies `Blog`
as "1:1 extension of ContentItem: author, author_vertical, cover, excerpt,
category, tags M2M, seo_title, seo_description, og_image" — a typed
relational shape (Option B), but only for Blog. No document reconciles why
Blog gets one treatment and every other proposed content type
(Page, Initiative, NEC, Event) would get the other.

## Problem

Left unresolved, Phase 2 implementation would have to choose one of these
patterns type-by-type with no stated rule, or implement both inconsistently.
The generic-JSON shape also carries a known long-term risk if used for types
with real structural requirements: without database-enforced schema and
without migrations forcing reviewed changes, the `data` field accretes ad
hoc keys over time and becomes an informally-typed, unenforced second schema.
This risk is concrete here, not hypothetical: `08_EVENT_OPERATING_MODEL.md`
already specifies Event needing real relational neighbours (`EventVertical`,
`EventParticipant`, `Speaker`/`Sponsor` M2M, `MediaCollection`) that do not
fit cleanly inside a JSON blob without denormalizing most of it back into
tables anyway.

## Options

**Option A — Generic `ContentItem` + JSON/structured fields for every type.**
Fast to add new types (no migration), but no DB-level schema integrity per
type, validation duplicated between backend and frontend, querying/reporting
via JSON path expressions, and the untyped-blob drift risk described above.

**Option B — Generic `ContentItem`/`ContentVersion` base + typed relational
detail model per type** (Django multi-table inheritance or an explicit
`OneToOneField` per type: `PageDetail`, `InitiativeDetail`, `NECDetail`,
`BlogDetail`, `EventDetail`). Slower to add a brand-new type (needs a
migration), but native DB schema integrity, native Django validation,
ordinary ORM querying/reporting, and a pattern that already matches how
`05_DATA_MODEL.md` treats Blog and how `08_EVENT_OPERATING_MODEL.md` expects
Event to relate to other entities.

Full comparison across schema integrity, implementation complexity,
validation, querying, reporting, migration, extensibility, Event-specific
requirements, SEO, revision history, permissions, and maintainability is in
`20_CMS_CONTENT_MODEL.md`.

## Decision recommendation

```text
ContentItem
    |
    +-- PageDetail
    +-- InitiativeDetail
    +-- NECDetail
    +-- BlogDetail
    +-- EventDetail
```

**Option B**, generalizing the pattern `05_DATA_MODEL.md` already uses for
Blog to every proposed content type, rather than running two different
content-typing strategies side by side. `ContentVersion`, workflow state,
`ApprovalRule`/`Approval`, and `MediaAsset` remain generic on the shared
base regardless of which option is chosen — this ADR only concerns how
type-specific fields are stored.

```text
STATUS: ACCEPTED (2026-09-28)
```

Approved by the project owner via the session override recorded in
`PHASE_2_AUTHORIZATION.md`. Implemented in `backend/apps/content/models.py`
(`ContentItem`/`ContentVersion` base + `PageDetail`/`InitiativeDetail`/
`NECDetail`/`BlogDetail`/`EventDetail`).

## Consequences

- If adopted, `05_DATA_MODEL.md`'s `ContentItem`/`Blog` section will need a
  follow-up documentation pass to describe the detail-model pattern
  consistently across all five types (not done as part of this ADR — that
  document is out of scope for this audit's edit authorization beyond noting
  the dependency here).
- New content types after Phase 2 require a migration (one detail table),
  not a data-reshaping exercise — this is treated as a feature (forces
  reviewed schema changes), not a limitation.
- `ContentVersion` still stores a generic snapshot (`data`, `blocks`) for
  versioning/diffing purposes per type; the detail model is the *current*
  typed state, while `ContentVersion.data` remains the historical record
  format already specified in `07_CONTENT_WORKFLOW.md` "Revision history &
  rollback." Reconciling exactly how a typed detail model's fields map into
  a versioned JSON snapshot for diffing is an implementation detail to work
  out during Phase 2 build, not a blocker to ratifying this ADR.
- No migration is required today — no CMS tables exist yet in any Django app.

## Human approval requirement

Ratified 2026-09-28 by the project owner (session override, recorded in
`PHASE_2_AUTHORIZATION.md`), per the same pattern used for ADR-010
(ratified 2026-09-25, recorded in the Phase 1 decision packet).
