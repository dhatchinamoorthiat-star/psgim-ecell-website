# 20 — CMS Content Model (Phase 2 proposal)

- **Date:** 2026-09-27
- **Status:** ACCEPTED — ADR-011 ratified 2026-09-28 (session override, see
  `PHASE_2_AUTHORIZATION.md`). The authoring UI described implicitly here
  (form-based editing) is superseded by the visual block editor — see
  `ADR-013-VISUAL-PAGE-BUILDER.md` and `25_VISUAL_EDITOR_ARCHITECTURE.md`.
  The content/version/approval data model below is unchanged by that pivot.
- **Written during:** Phase 1→Phase 2 readiness audit, after Phase 1 merge (`3757588`) and security remediation

This document formalizes the CMS architecture already sketched across
`05_DATA_MODEL.md`, `06_CMS_ARCHITECTURE.md` and `07_CONTENT_WORKFLOW.md`
into a single Phase 2 proposal, and resolves the one place those documents
leave an open fork: how `ContentItem` typing is implemented. It does not
replace those documents — it is the decision layer that sits on top of them.

## Purpose

Phase 1 built the organisation's identity, membership and RBAC/approval
**rule engine** but deliberately shipped no content model
(`apps/rbac/approvals.py` notes: "content arrives in Phase 2"). Phase 2
exists to replace manual `*.data.ts` edits + Git commits + manual deploys
for institutional content (pages, initiatives, NEC material, events, blog
posts) with an authored, versioned, approved, and auditable publishing
pipeline — without introducing a runtime dependency for the public website.

## Architectural principles

- **Structured institutional content.** Content that has predictable shape
  (an Event has dates and a venue; a Blog has an author and tags) gets typed
  fields, not free text, so it can be filtered, reported on, and rendered
  consistently. See `06_CMS_ARCHITECTURE.md` "Structured first, blocks second."
- **Version history.** Every save is a new `ContentVersion`; history is never
  rewritten (`07_CONTENT_WORKFLOW.md` "Revision history & rollback").
- **Permission-based editing.** Who can edit, submit, approve, or publish is
  RBAC (`03_RBAC_MODEL.md`, `04_PERMISSION_MATRIX.md`), never hardcoded into
  the content model.
- **Scope-aware RBAC.** Approval and publish rights can be scoped to a
  vertical (`OWNER_VERTICAL`) or global, per the existing `ApprovalRule`
  design (`07_CONTENT_WORKFLOW.md`).
- **Auditable transitions.** Every workflow transition writes an `AuditLog`
  row (`09_AUDIT_LOG_SPECIFICATION.md`); illegal transitions are HTTP 409.
- **Published content isolation.** The public API reads only
  `published_version`; drafts, rejected versions, and in-review content are
  never reachable through it (`06_CMS_ARCHITECTURE.md` "Draft/published
  separation").
- **Static public-site delivery, no runtime dependency for public rendering.**
  The public site stays prerendered; publishing triggers a rebuild rather than
  making page rendering depend on a live backend request (ADR-002, see §
  below and `docs/ADR-002` status note).

## Proposed model

As specified in `05_DATA_MODEL.md` §CMS and `07_CONTENT_WORKFLOW.md`:

```text
ContentItem      — type, slug, owner_vertical, workflow state, published_version_id,
                    draft_version_id, publish_at, unpublish_at, is_verified
ContentVersion   — content_item, number, data, blocks, author, created_at, change_note
ApprovalRule     — match conditions (content_type, owner_vertical, event_kind),
                    ordered stages, priority, is_active
ApprovalStage /
Approval         — stage kind (ORGANIZATIONAL | FACULTY), required permission,
                    scope, min_approvers; Approval = a recorded decision against a version
MediaAsset       — Cloudinary-backed, kind, alt_text (required for images before publish),
                    owner_vertical, uploaded_by
```

`ApprovalStage` is not a separate persisted table in the current spec — it is
an ordered array embedded inside `ApprovalRule.stages` (see
`07_CONTENT_WORKFLOW.md` "ApprovalRule model"). `Approval` is the persisted
decision record against a specific stage and version. This document does not
change that; it is noted here because the task that requested this document
named `ApprovalStage` as if it were its own model, and the existing spec
should not be silently duplicated or contradicted.

### Proposed content types

```text
Page          — institutional pages (About, Origin, Vision, Reach, History, …)
Initiative    — vertical/programme-level initiatives
NEC           — NEC-specific institutional content
Event         — public content face of an Event (see `08_EVENT_OPERATING_MODEL.md`;
                operational registration/check-in/certificates are Phase 3, see ADR-012)
Blog          — authored posts, already specified as a typed 1:1 extension in
                `05_DATA_MODEL.md` ("Blog: 1:1 extension of ContentItem")
```

## Architecture fork: how is `ContentItem` typed?

`05_DATA_MODEL.md` as currently written is itself not fully decided on this
point: it lists `ContentItem.type` as an enum with a `data JSONB` field
"validated by the type's schema" (Option A shape), but also separately
specifies `Blog` as "1:1 extension of ContentItem" with its own typed columns
(Option B shape) for exactly one content type. This document exists to make
that choice explicit and consistent across **all** proposed content types,
not just Blog.

### Option A — Generic `ContentItem` + JSON/structured fields

A single `ContentItem` table with a `type` enum and a `data JSONB` column
validated against a per-type JSON Schema at the application layer.

| Dimension | Assessment |
|---|---|
| Schema integrity | Enforced only in application code / JSON Schema validators, not by the database. A migration bug or a raw update can write a `Page` with `Event`-shaped data and Postgres will not object. |
| Django implementation complexity | Low to add a new type (no migration), but validation, serialization, and admin editing must all be built by hand on top of the JSON field. |
| Angular editor complexity | Comparable to Option B — the editor renders a per-type form either way, driven by the JSON Schema. |
| Validation | Must be re-implemented/duplicated between backend (DRF serializer against schema) and frontend (form validation), since Django's own field validation does not apply to JSON contents. |
| Querying / filtering | Requires Postgres JSON path queries (`->>`) or GIN indexes on JSONB; workable, but slower and less ergonomic than column queries, and every new filterable field needs a new expression index. |
| Reporting | Ad hoc JSON extraction in every report query; no natural foreign keys from typed sub-fields (e.g. an Event's venue cannot be a proper FK without denormalizing it out of the JSON). |
| Migration | Cheap now (no schema change to add a type), expensive later (backfilling/reshaping JSON blobs at scale is harder than a column migration). |
| Extensibility | Very easy to add new ad hoc keys — which is also the risk (see below). |
| Event-specific requirements | Event content needs materially different structured relationships (per `08_EVENT_OPERATING_MODEL.md`: venue, EventVertical, EventParticipant, Speaker/Sponsor M2M) that do not fit cleanly inside a single JSON blob without denormalizing most of it back into real tables anyway — undermining the model's own premise. |
| SEO | SEO fields (title, description, og_image) can live in JSON but are then invisible to the ORM's own query/filter/index tooling used elsewhere in the platform. |
| Revision history | Works the same as Option B — versioning is on `ContentVersion`, independent of this fork. |
| Permissions | Independent of this fork — RBAC governs at the `ContentItem`/type level either way. |
| Long-term maintainability | **Primary risk the task asked to evaluate**: without disciplined schema governance, the JSON blob accretes ad hoc keys added by different people over time with no enforcement, becoming an untyped, undocumented second schema that nothing in the codebase actually validates end-to-end. |

### Option B — Generic `ContentItem` + typed relational detail models

A shared `ContentItem`/`ContentVersion` base (carrying everything generic:
slug, owner_vertical, workflow state, publish pointers, audit) with a
one-to-one **detail table per content type** (Django multi-table inheritance
or an explicit `OneToOneField`), e.g. `PageDetail`, `InitiativeDetail`,
`NECDetail`, `BlogDetail`, `EventDetail`.

| Dimension | Assessment |
|---|---|
| Schema integrity | Enforced by Postgres: a `PageDetail` cannot accidentally carry `EventDetail` columns; NOT NULL/FK constraints apply per type. |
| Django implementation complexity | Higher upfront (a migration and a model per type), but each type gets Django's ordinary form/serializer/admin validation for free. |
| Angular editor complexity | Comparable to Option A. |
| Validation | Native Django field validation (`CharField(max_length=...)`, FKs, choices) instead of hand-rolled JSON Schema checking. |
| Querying / filtering / reporting | Ordinary ORM joins and column indexes — no JSON path expressions needed, straightforward `select_related`/`annotate`. |
| Migration | A new content type costs one migration; changing an existing type's shape is an ordinary, reviewable schema migration instead of a data-reshaping exercise. |
| Extensibility | Deliberately less "free" than Option A — adding a field requires a migration, which is the discipline that prevents the untyped-blob failure mode. |
| Event-specific requirements | Matches `08_EVENT_OPERATING_MODEL.md` directly: `EventDetail` can hold real FKs to `Speaker`, `Sponsor`, `EventVertical`, etc., with no denormalization detour. |
| SEO | SEO fields become real, indexable, queryable columns on the relevant detail models. |
| Revision history | Same as Option A — versioning stays on the generic `ContentVersion`, independent of the fork. Detail-model field changes across versions still need a documented pattern (see Consequences in ADR-011). |
| Permissions | Independent of this fork. |
| Long-term maintainability | Scales predictably as Event (and future types) grow more structured requirements; avoids the JSON-blob drift risk by construction. |

## Recommendation

**Option B — typed relational detail models**, for the reasons above,
particularly: the content types are already enumerated and known (Page,
Initiative, NEC, Event, Blog are not an open-ended set), Event's operational
neighbours (`08_EVENT_OPERATING_MODEL.md`) already assume real relational
structure, and `05_DATA_MODEL.md` already independently arrived at a
typed-extension pattern for Blog — Option B simply generalizes that pattern
consistently instead of running two different content-typing strategies side
by side.

```text
STATUS: PROPOSED
DECISION OWNER: HUMAN
DECISION REQUIRED: YES
```

This is an engineering recommendation, not an accepted decision. See
`ADR-011-CMS-CONTENT-MODEL.md` for the formal ADR record and
`PHASE_2_AUTHORIZATION.md` for how this gates Phase 2 implementation start.

## Proposed ADR

> **ADR-011: CMS Content Model — Typed Subclasses over Generic JSON**
> Status: **PROPOSED**

See `docs/ADR-011-CMS-CONTENT-MODEL.md`.
