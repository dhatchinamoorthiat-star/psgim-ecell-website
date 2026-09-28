# 24 — Succession & Governance (planning document)

- **Date:** 2026-09-27
- **Status:** PROPOSED / informational — this is a planning document, not an
  implementation and not itself a Phase 2 deliverable

This document consolidates what is currently implemented, what is planned,
and what remains an open human decision regarding academic-year succession,
role continuity, and institutional/infrastructure ownership. It does not
invent a turnover month, successor names, or ownership assignments.

## CURRENTLY IMPLEMENTED (Phase 1)

- `AcademicYear(label, starts_on, ends_on, is_current)` model, with
  `Membership`, `RoleAssignment`, and (per `10_ACADEMIC_YEAR_AND_SUCCESSION.md`)
  intended `LeadershipAssignment`/`Event` carrying `academic_year`.
- RBAC invariants that protect continuity regardless of who holds roles:
  R3 (at least one `role.manage` holder must remain — 409 if an action would
  remove the last one, across academic-year switches and concurrent
  deactivations) and R4 (no self-assignment changes), per
  `ADR-010-GOVERNANCE-GRANT-EXEMPTION.md`.
- Append-only `AuditLog` (`apps/audit`, DB-trigger enforced) — every
  role grant/revoke is recorded with the actor's roles at the time
  (`03_RBAC_MODEL.md`, `09_AUDIT_LOG_SPECIFICATION.md`).
- ADR-010's ratified position that the platform identifies **accounts, not
  human identity** — succession and continuity controls operate on accounts,
  and cross-account/cross-person risk is an accepted organisational risk,
  not a technical guarantee (see ADR-010 "Residual governance risk").

## PLANNED (specified, not built)

- **Succession workflow** (`/platform/admin/succession`), per
  `10_ACADEMIC_YEAR_AND_SUCCESSION.md`: Super Admin/Admin Head selects a
  position and successor; the system surfaces the incumbent's open items
  (tasks, requests, drafts in review, owned events); each item is
  transferred, reassigned, or left; incumbent writes optional handover notes
  linked to a Knowledge Base article; a typed confirmation commits, in one
  transaction, ending the incumbent's `LeadershipAssignment`/`RoleAssignment`
  and creating the successor's with a `predecessor_id` chain; `AuditLog
  succession.complete`; both parties notified. The incumbent's account is
  not deleted; it becomes `alumni` at year rollover if no membership remains.
- **Year rollover** (`academic_year.rollover`, Super Admin action): creates
  the next `AcademicYear`, optionally copies vertical memberships as "pending
  confirmation," flips `is_current`. Past years stay read-only.
- **Knowledge Base** (`11_KNOWLEDGE_BASE.md`): per-vertical and
  organisation-wide spaces, versioned like CMS content but never publicly
  published. Seed content (Events SOP, Technical deployment/CMS/Git/incident
  guides, onboarding) is explicitly "to be written by humans, not
  generated" — this document does not draft that content.
- **Infrastructure handover checklist** (`17_DEVELOPER_HANDOVER.md` §9,
  referenced from `10_ACADEMIC_YEAR_AND_SUCCESSION.md`): Technical Head
  succession triggers a checklist covering Cloudflare, GitHub org, database,
  Cloudinary, and email owner transfer. Platform role changes do **not**
  automatically transfer third-party account ownership — that remains a
  manual, checklist-driven human process.

## Predecessor/successor relationship

Already modeled structurally via `LeadershipAssignment.predecessor_id`
(`05_DATA_MODEL.md`), enabling queries like "successor of the 2026-27
Technical Head" as a chain. This is a historical record, not a live
authorization mechanism — holding `predecessor_id` does not itself grant any
permission.

## Audit continuity

Succession and rollover actions produce ordinary `AuditLog` rows
(`succession.complete`, role grant/revoke) in the same append-only log used
elsewhere. No separate succession-specific audit mechanism is proposed or
needed.

## NOT DETERMINED — HUMAN DECISION REQUIRED

```text
STATUS: NOT DETERMINED
DECISION OWNER: HUMAN
DECISION REQUIRED: YES
```

- **Turnover month (N-7).** The Control Room notes leadership is "handed on
  each October," but `10_ACADEMIC_YEAR_AND_SUCCESSION.md` itself flags this
  as unconfirmed: "confirm the actual turnover month before seeding year
  boundaries." This document does not assume October is correct.
- **Initial Super Admins (N-5).** At least two people are required so the
  "last Super Admin" rule (R3) never locks the organisation out
  (`ADR-010-GOVERNANCE-GRANT-EXEMPTION.md`). No names are assigned here.
- **GitHub/infrastructure ownership (N-6).** Repositories currently sit on a
  personal account; moving them to an organisation is recommended before CI
  hardening but is not yet done (`PHASE_1_AUTHORIZATION.md`).
- **Hosting/account ownership (N-1).** Which E-Cell-owned email/payment
  method owns Render, Neon, Cloudflare, and Cloudinary is unresolved.
- **Python-capable successor staffing plan (N-9).** Flagged as a staffing
  risk from the choice of Django, to be revisited "at Technical Head
  handover" (`PHASE_1_AUTHORIZATION.md`) — no successor is named here.
- **Repository ownership at organisational level** more broadly (who has
  admin rights on the eventual GitHub organisation, separate from N-6's
  transfer decision) is not addressed in any current document.

## What this document does not do

It does not implement the succession workflow, does not seed an
`AcademicYear` row, does not name a turnover month, and does not name any
Super Admin, Faculty Advisor, or successor. It exists so that when those
human decisions are made, there is one place documenting exactly what
technical continuity mechanism they plug into.
