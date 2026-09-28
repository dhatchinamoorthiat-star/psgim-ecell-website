# 21 — CMS Workflow (Phase 2 operationalization)

- **Date:** 2026-09-27
- **Status:** IMPLEMENTED (Phase 2A, `backend/apps/content/workflow.py`) —
  operationalizes the already-specified workflow in `07_CONTENT_WORKFLOW.md`;
  does not redefine it. N-3 (ApprovalRule policy) and N-4 (Faculty Advisor
  identity) remain open per `PHASE_2_AUTHORIZATION.md` — the engine is
  implemented and tested, but no production policy or role assignment is
  seeded. See also `ADR-013-VISUAL-PAGE-BUILDER.md` for the visual-authoring
  layer this workflow now sits under.

`07_CONTENT_WORKFLOW.md` already specifies the authoritative state machine
(`DRAFT → SUBMITTED → IN_REVIEW → APPROVED → SCHEDULED → PUBLISHED →
ARCHIVED`, with `CHANGES_REQUESTED` looping back to `DRAFT`) and the
configurable `ApprovalRule` engine (ORGANIZATIONAL and FACULTY stage kinds).
This document does not replace that state machine. It restates it against
the illustrative fixed sequence used in the Phase 2 planning conversation
(`Draft → Editorial Review → Faculty Approval → Approved → Published`) so the
two are not read as competing designs, and it fills in the operational
detail (scheduling, rejection, audit, notification) the task asked for.

## Mapping the illustrative sequence onto the actual engine

| Illustrative stage | Actual mechanism |
|---|---|
| Draft | `DRAFT` state on the current `ContentVersion` |
| Editorial Review | `SUBMITTED` → `IN_REVIEW`, an **ORGANIZATIONAL** `ApprovalRule` stage (`content.approve`) |
| Faculty Approval | An additional **FACULTY** `ApprovalRule` stage (`content.approve_faculty`), only present when a matching rule requires it — not a universal step |
| Approved | `APPROVED` (all required stages, per the resolved `ApprovalRule` union, satisfied) |
| Published | `APPROVED`/`SCHEDULED` → `PUBLISHED` via `content.publish` or the tick job |

"Faculty Approval" is therefore not a fixed pipeline stage — it only appears
for content matching an active `ApprovalRule` with a FACULTY stage. This is
intentional and already decided (`07_CONTENT_WORKFLOW.md` "Approval rules
(specification, decided 2026-09-25)"): faculty approval is **configuration,
not architecture**, because the Control Room's historical faculty-approval
trigger applied only to events, and the public Angular site has never had
any approval step at all.

## Workflow state vs. RBAC permission

These are deliberately separate axes and must not be conflated:

- **Workflow state** — a property of the `ContentVersion`: `DRAFT`,
  `SUBMITTED`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `SCHEDULED`,
  `PUBLISHED`, `ARCHIVED`.
- **RBAC permission** — who is allowed to cause a transition. The permission
  catalogue already implemented in `backend/apps/rbac/catalogue.py` and
  documented in `04_PERMISSION_MATRIX.md`:

```text
content.view              — see draft/in-review content (scoped)
content.submit            — DRAFT → SUBMITTED
content.review            — SUBMITTED → IN_REVIEW → CHANGES_REQUESTED
content.approve            — IN_REVIEW → APPROVED (organizational stage)
content.approve_faculty    — faculty stage, held only by FACULTY_ADVISOR (GLOBAL)
content.schedule           — APPROVED → SCHEDULED
content.publish            — APPROVED/SCHEDULED → PUBLISHED, and PUBLISHED → ARCHIVED (unpublish)
```

No separate `content.approve_editorial` or `content.unpublish` permission
currently exists in the RBAC catalogue. "Editorial" review in the
illustrative sequence maps onto the existing generic `content.approve`
(ORGANIZATIONAL kind), and unpublishing is the same `content.publish`
permission applied to the `PUBLISHED → ARCHIVED` transition
(`07_CONTENT_WORKFLOW.md`, Transitions table). Introducing a distinct
`content.unpublish` permission (finer-grained than today) is a possible
future refinement, not a current requirement:

```text
STATUS: PROPOSED (optional refinement, not required for Phase 2)
DECISION OWNER: HUMAN
DECISION REQUIRED: NO — only if finer-grained publish/unpublish separation is wanted
```

Roles are never hardcoded against stages — `ApprovalRule` resolves which
permission is required per content type/vertical/event kind at submit time
(`07_CONTENT_WORKFLOW.md` "Resolution").

## Rejection and reviewer comments

`IN_REVIEW → CHANGES_REQUESTED` requires a comment (`04_PERMISSION_MATRIX.md`,
`07_CONTENT_WORKFLOW.md` Transitions table: "comment required; notify
author"). `CHANGES_REQUESTED` loops back to `DRAFT` on edit — rejection does
not delete the version or its history; the author edits and resubmits,
producing a new draft in the normal versioning chain.

## Published versions vs. drafts, and version interaction

Each `ContentItem` tracks `published_version_id` and `draft_version_id`
independently (`06_CMS_ARCHITECTURE.md` "Draft/published separation"). Editing
after `APPROVED` always creates a new draft and resets that draft's workflow
to `DRAFT` — it never mutates the approved/published version in place
(`07_CONTENT_WORKFLOW.md` Transitions table, "any edit after APPROVED").
Approval is bound to a specific version; approving v3 never approves a
later-edited v4 (`07_CONTENT_WORKFLOW.md` Invariant 3).

## Scheduled publication and unpublication

`publish_at` / `unpublish_at` are entered in `Asia/Kolkata`, stored UTC. The
existing Cloudflare Cron Worker tick (`POST /api/internal/tick`, every 5
minutes, ADR-006) evaluates `state=SCHEDULED AND publish_at <= now()` with
`FOR UPDATE SKIP LOCKED` for idempotency (`07_CONTENT_WORKFLOW.md`
"Scheduling"). `unpublish_at` is handled the same way, moving `PUBLISHED →
ARCHIVED` automatically. Worst-case latency is 5 minutes plus site rebuild
time (`06_CMS_ARCHITECTURE.md` "Publish pipeline" — a ~2–3 minute Cloudflare
Pages rebuild via deploy hook / `repository_dispatch`).

## Audit and notification requirements

Every transition writes an `AuditLog` row; illegal transitions return HTTP
409 (`07_CONTENT_WORKFLOW.md` "Transitions"). Notification triggers (in-app
list, optional daily email digest, no realtime sockets) are specified in
`08_EVENT_OPERATING_MODEL.md` "Notifications (lightweight)" and apply
identically to CMS review/approval events (e.g. "notify reviewers per
ApprovalRule" on submit, "notify author" on rejection).

## Scope: does faculty approval apply to all content, or selected content?

Already decided as **selected, configurable content** — not universal — via
`ApprovalRule` match conditions (`content_type`, `owner_vertical`,
`event_kind`). See `07_CONTENT_WORKFLOW.md` "Supported configurations
(examples)" for the full set of illustrative policies (no faculty approval by
default; faculty approval for selected types, verticals, or event kinds; a
Vertical Head self-publish exception for in-vertical blogs).

**What is not yet decided** is which of those configurations is actually
adopted for go-live. That is **N-3** (unresolved):

```text
STATUS: PROPOSED (default rule only — one ORGANIZATIONAL stage, 1 approver — until configured)
DECISION OWNER: HUMAN
DECISION REQUIRED: YES
```

And **N-4** (unresolved) — who currently holds `FACULTY_ADVISOR`:

```text
STATUS: NOT DETERMINED
DECISION OWNER: HUMAN
DECISION REQUIRED: YES
```

This document does not assign a Faculty Advisor and does not pick a
production `ApprovalRule` configuration. The workflow **engine** (state
machine, permission model, ApprovalRule resolution) is implementation-ready
independent of N-3/N-4; only the **concrete configuration** used at first
publish depends on them (`PHASE_1_AUTHORIZATION.md`: N-3/N-4 "Gates: first
CMS publish / faculty role assignment (Phase 2)").
