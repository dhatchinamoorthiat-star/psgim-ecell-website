# ADR-012 — Event Model: Content/Operational Split

- **Status:** **PROPOSED** — 2026-09-27
- **Found during:** Phase 1→Phase 2 readiness audit
- **Kind:** recommends an architectural boundary for a model that does not
  exist in code yet. Not a redesign of anything built.

## Context

`08_EVENT_OPERATING_MODEL.md` already states "An Event is an operational
object with a public face, not a post," and lists both the public-content
side (`ContentItem`, versioned, workflow, preview) and the operational side
(Team, Workstreams, Requests, Registration, Documents, Approvals,
Post-event report) under one `Event` heading. The legacy `ecell/`
application, inspected directly during this audit, already implements these
as separate concerns in practice: public event content lives in
`events.ts`, registration in `actions/register.ts`, QR check-in in
`api/checkin/route.ts`, certificates in `actions/certificates.ts` — distinct
modules, not one combined entity.

## Problem

If Phase 2 modeled `Event` as a single object combining public content and
live operational state (registrations, check-ins, certificates), two
concerns with very different lifecycle and access-control needs would be
coupled:

- Public content follows the CMS draft/review/approve/publish/version
  lifecycle (`07_CONTENT_WORKFLOW.md`) and must be safely editable and
  re-versionable at any time.
- Operational data (registrations, check-ins, certificates) must generally
  never be retroactively altered once recorded, needs fast/offline-tolerant
  writes at the point of use (a check-in desk), and has no meaningful
  "draft" or "version" concept in the CMS sense.

Coupling them risks both: making operational data accidentally subject to
content-versioning/rollback semantics it should not have, or making content
edits accidentally gated by operational-state concerns unrelated to
publishing.

## Options

**Option A — Unified `Event` model** covering content, sessions, speakers,
registration, check-in, and certificates in one entity.

**Option B — Split model**: `ContentItem` (Event type, per ADR-011) for the
public content face; a separate Event **operational object** for
registration, check-in, certificates, feedback, and reporting.

```text
ContentItem(Event)
       |
       | public content
       |
       +---- Event operational object
                 |
                 +-- Registration
                 +-- CheckIn
                 +-- Certificate
                 +-- Feedback
                 +-- Reporting
```

## Decision recommendation

**Option B.** This matches the legacy system's own separation of concerns
(evidence above), matches `05_DATA_MODEL.md`'s existing sketch (`Event
⇐ CR:activities ... content_item (public face, versioned)` — already
distinguishing the content_item from the Event row itself), and keeps CMS
draft/approval/versioning semantics scoped strictly to content, never to
operational records like registrations or issued certificates.

```text
STATUS: PROPOSED
DECISION OWNER: HUMAN
DECISION REQUIRED: YES
```

## Scope implication for Phase 2

Per `23_OPERATIONS_MODEL.md`, this ADR's split is also what makes the
Phase 2/Phase 3 boundary coherent: **Phase 2 builds only the content side**
(`ContentItem` Event type, per ADR-011's `EventDetail`). Registration,
check-in, certificates, feedback, and event reporting are Phase 3, gated on
this ADR's ratification and on the content side existing first.

## Consequences

- No migration required today — no Event model exists in code yet.
- Event's public content (dates, venue description, media, SEO) can be
  drafted/reviewed/published through the ordinary CMS pipeline
  (`21_CMS_WORKFLOW.md`) without waiting on any Phase 3 operational design.
- Cancellation, event history, and draft-vs-live event data questions (asked
  of this audit) resolve naturally under the split: content lifecycle
  (draft/published/archived) is independent of operational lifecycle
  (planning/live/completed, per `05_DATA_MODEL.md`'s `Event.status`
  enum) — cancelling an event is an operational-object concern; archiving
  its public page is a content concern. The exact operational-object schema
  (fields, cancellation semantics, status transitions) is Phase 3 design
  work, out of scope for this ADR and not specified here to avoid
  fabricating detail ahead of that phase.
- Migration from the legacy Control Room's `activities` table (per
  `22_MIGRATION_MATRIX.md`) will need to map onto both sides of the split —
  content fields to `ContentItem`/`EventDetail`, operational fields
  (registration/check-in/certificate data) to the future operational object —
  rather than one single import.

## Human approval requirement

Requires project owner ratification before Phase 2 Event content-type
implementation begins, and before any Phase 3 event-operations design work
starts (since that design depends on this boundary being settled first).
