# 23 — Operations Model: Content vs. Event Operations

- **Date:** 2026-09-27
- **Status:** PROPOSED — depends on ADR-012 (unratified)

This document separates two operational domains that must not be merged
into one model: **content operations** (publishing institutional content)
and **event operations** (running the logistics of an event). It documents
the split proposed in `ADR-012-EVENT-MODEL-SPLIT.md` and states plainly that
**Phase 2 implements the content side only.**

## Content operations (Phase 2)

```text
ContentItem
ContentVersion
Approval (via ApprovalRule)
Publishing (draft/published pointer swap, tick-driven scheduling)
Media (MediaAsset, Cloudinary)
Public snapshot (read-only API consumed by the Angular prerender step)
```

This is the domain specified in `20_CMS_CONTENT_MODEL.md` and
`21_CMS_WORKFLOW.md`. It has no dependency on live event logistics — an
Event's public content (description, dates, media, SEO) can be drafted,
reviewed, approved, and published exactly like a Page or Blog.

## Event operations (Phase 3 — not built in Phase 2)

```text
Event (operational object)
Registration
CheckIn
Certificate
Feedback
Reporting
```

Per `ADR-012`, this is deliberately **not** part of the `ContentItem`
hierarchy. It has different lifecycle rules (registrations must never be
retroactively altered once check-in has occurred; certificates are
issued once and verified publicly by serial number) and different access
patterns (a check-in desk needs fast, offline-tolerant writes; a public
content page needs cached, prerendered reads). Building both into one
model would recouple concerns that the legacy `ecell/` system already keeps
separate in practice (`events.ts` vs. `actions/register.ts` vs.
`api/checkin/route.ts` vs. `actions/certificates.ts` — see
`22_MIGRATION_MATRIX.md`).

```text
STATUS: PROPOSED
DECISION OWNER: HUMAN
DECISION REQUIRED: YES (via ADR-012 ratification)
```

## Scope boundary for Phase 2

> Phase 2 builds the CMS/content pipeline, including the Event **content**
> type. It does **not** build event registration, check-in, certificates,
> or event reporting. Those remain on the legacy `ecell/` Control Room until
> a Phase 3 decision authorizes migrating them (see `22_MIGRATION_MATRIX.md`
> rows for Registration/QR check-in/Certificates/Event-day sessions, all
> `Not started`).

## Permission enforcement

Content-side permissions are the RBAC set already documented in
`21_CMS_WORKFLOW.md` (`content.view`, `content.submit`, `content.review`,
`content.approve`, `content.approve_faculty`, `content.schedule`,
`content.publish`). Event-operations permissions (registration management,
check-in desk access, certificate issuance) are **not yet designed** and are
out of scope for this document and for Phase 2.

## Audit

Both domains write to the same append-only `AuditLog`
(`09_AUDIT_LOG_SPECIFICATION.md`) — there is one audit trail for the
platform, not one per domain. This does not change with the content/event
split; it is a property of the audit system, orthogonal to it.

## Scheduled jobs

The existing Phase 1 architecture already commits to no Redis/Celery in V1
(ADR-006, `02_SYSTEM_ARCHITECTURE.md`): a Cloudflare Worker Cron Trigger
calls `POST /api/internal/tick` every 5 minutes with a shared secret, running
idempotent jobs recorded in a `JobRun` table. This same mechanism is reused,
not duplicated, for:

- CMS scheduled publish/unpublish (`21_CMS_WORKFLOW.md` "Scheduled
  publication and unpublication") — Phase 2.
- Any future event-operations scheduled jobs (e.g. reminder sends,
  certificate batch generation) — Phase 3, not designed yet.

**Idempotency expectation**: every tick job must be safe to run more than
once for the same window (the existing pattern:
`state=SCHEDULED AND publish_at <= now() FOR UPDATE SKIP LOCKED`). This
expectation carries forward unchanged into any Phase 3 event-operations jobs
added to the same tick endpoint — it is not re-specified per domain.

## What this document does not do

It does not design the Phase 3 event-operations data model (Registration,
CheckIn, Certificate schemas) — that is out of scope for Phase 2 readiness
and would be fabricating detail the project owner has not yet requested.
