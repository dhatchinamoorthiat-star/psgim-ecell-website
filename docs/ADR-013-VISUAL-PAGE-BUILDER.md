# ADR-013 — Visual Page Builder (extends ADR-011)

- **Status:** **IMPLEMENTED — PROPOSED FOR RATIFICATION** (2026-09-28)
- **Scope built:** Phase 2A only (content model, workflow engine, block
  registry, API). See `docs/25_VISUAL_EDITOR_ARCHITECTURE.md` for the full
  phased plan and what is explicitly not built yet.

## Problem

The task that produced `docs/20_CMS_CONTENT_MODEL.md` /
`docs/21_CMS_WORKFLOW.md` / `ADR-011-CMS-CONTENT-MODEL.md` specified a
conventional form-based CMS: editors would fill in typed fields per content
type. A later, more specific instruction supersedes that UI approach: the
authoring experience must be a controlled visual (Canva/Figma-like) page
builder — editors see and directly manipulate the actual rendered page,
composed from a fixed catalogue of block components, rather than filling
out forms.

This is a **UI/authoring-model change, not a data-model change.** ADR-011
already resolved how *structured metadata* is stored (typed detail models
per content type). What ADR-013 adds is that the *page layout itself* —
which blocks appear, in what order, with what props — is also part of each
`ContentItem`, stored as a schema-validated JSON document
(`ContentVersion.blocks`) and edited visually instead of as one big form.

## Relationship to ADR-011

ADR-013 does not replace or contradict ADR-011:

```text
ContentItem / ContentVersion (ADR-011 base, unchanged)
    |
    +-- PageDetail / InitiativeDetail / NECDetail / BlogDetail / EventDetail
    |       (ADR-011 Option B: typed relational metadata — dates, author,
    |        venue, SEO fields — unchanged by this ADR)
    |
    +-- ContentVersion.blocks (ADR-013: the visual page document —
            an ordered, schema-validated tree of block instances)
```

A `ContentItem` has both: typed metadata (ADR-011) for the structured facts
a report or filter might need, and a `blocks` document (ADR-013) for the
visual page layout. Neither replaces the other.

## Controlled component model

The editor is **not** an HTML/CSS/JS sandbox. Every block instance is
`{id, type, props, children}`, where `type` must reference an active
`ContentBlockType` and `props` must validate against that type's schema
(`backend/apps/content/validation.py`). This is enforced server-side on
every write — the only place blocks are trusted from (task security
requirement). No block type in the Phase 2A catalogue accepts raw HTML or
script content; rich text is bounded plain text/structured props, not an
HTML string, until a dedicated sanitizer is deliberately added in a later
phase.

## Shared renderer invariant

Editor rendering must never diverge from public rendering: both must
consume the same `blocks` document through the same block-to-component
mapping. Phase 2A builds the document, schema, and validated API only — the
Angular block-renderer component registry that makes this invariant real is
Phase 2B, not yet built. Until then, the 17 existing public page components
continue to render from `*.data.ts` exactly as before; nothing about their
behavior changes in this phase.

## Consequences

- `docs/20_CMS_CONTENT_MODEL.md` / `21_CMS_WORKFLOW.md` remain accurate for
  the generic content/workflow/approval model; they should be read together
  with this ADR and doc 25 for the visual-authoring layer specifically.
- The block-type catalogue is data (`ContentBlockType` rows), not code —
  adding a new block type is a migration-free operation (seed data +, once
  built, an Angular component registered against the `key`), matching the
  task's "controlled design system, not arbitrary HTML" requirement.
- Phase 2B (shared renderer + existing-page migration), 2C (editor canvas),
  2D (approval UI + deployment abstraction), 2E (build/deploy pipeline) are
  separate, not-yet-built increments — see doc 25 for what each covers.

## Human approval requirement

Marked `IMPLEMENTED — PROPOSED FOR RATIFICATION`: the Phase 2A code exists
and is tested, but formal ratification of this architectural direction
(as opposed to Phase 2A's specific code) is still the project owner's to
give explicitly, separate from the in-session development override
recorded in `PHASE_2_AUTHORIZATION.md`.
