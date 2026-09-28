# Phase 2 Authorization

- **Date:** 2026-09-27
- **Basis:** Phase 1→Phase 2 readiness audit, verified against
  `HEAD = origin/main = 3757588` ("security: remediate Phase 1 deployment
  gates"), CI green on that commit.

## Status

```text
AUTHORIZED (session override, 2026-09-28) — see "Override record" below
```

Phase 2 CMS implementation should not begin until the required human
decisions below are made. This document is the formal gate; it does not
authorize any deployment, schema change, or application code by itself.

## Override record (2026-09-28)

The project owner, working directly in an interactive session on
`feature/phase-2-visual-cms`, was presented with this document's blocking
checklist before any Phase 2 code was written and explicitly chose to
proceed rather than resolve each item individually first ("Override — you
are the owner, proceed now"). This is recorded here as the actual
authorization event, superseding the `NOT AUTHORIZED` status above for the
two items it covers:

- **CMS content model (ADR-011)** — treated as approved; Option B (typed
  relational detail models) is adopted. See status update in
  `ADR-011-CMS-CONTENT-MODEL.md`.
- **ADR-002 (public content pipeline)** — treated as ratified. See status
  update in `02_SYSTEM_ARCHITECTURE.md`.

The remaining three blocking items are **not** resolved by this override
and remain open, because they require organisational facts this session has
no authority to invent (task instructions explicitly forbid inventing
Faculty Advisor identity or organisational verticals):

- **F9 session model** — unchanged; still the shipped 12-hour sliding/idle
  session, not the documented 7-day-cap model. Not touched by Phase 2A.
- **N-3 ApprovalRule policy** — unresolved; Phase 2A code implements the
  configurable `ApprovalRule` engine and ships only the documented default
  (one ORGANIZATIONAL stage, 1 approver). No production policy is seeded.
- **N-4 Faculty Advisor identity** — unresolved; no `FACULTY_ADVISOR` role
  assignment is created by this work. The permission and role exist (Phase
  1 catalogue); nobody holds it.

Scope actually built under this override is Phase 2A only (content model,
workflow engine, block registry, API) — see
`docs/25_VISUAL_EDITOR_ARCHITECTURE.md` §"Phased plan". No production
deployment, no Cloudflare/Render/Neon configuration change, and no legacy
`ecell/` modification occurred as part of this override.

## Phase 1 prerequisite

Confirmed directly from Git, not assumed from prior planning documents:

- `main` and `origin/main` both point at `3757588`, one commit past the
  `platform/phase-1` merge (`36aeb69`).
- CI is green on both the merge commit and the remediation commit.
- Security gates F3 (login throttling), F4 (trusted client IP / proxy
  secret), F5 (password reset timing/safety), F8 (audit append-only), and
  F13 (Cloudflare preview label validation) are verified **CLOSED** against
  code and passing tests.
- No production deployment has occurred as part of Phase 1 or the security
  remediation. `docs/16_DEPLOYMENT.md` explicitly warns that deploying the
  current `platform/phase-1` work now would publish a non-functional
  `/platform` (503 from the inert API proxy) — deployment readiness is a
  separate question from Phase 2 development readiness.

Phase 1's RBAC/approval rule engine (`apps/rbac/approvals.py`,
`apps/rbac/catalogue.py`) was deliberately built ahead of any content model,
specifically so Phase 2 CMS work has a ready foundation to build against.

## Phase 2 objective

Build the CMS content pipeline and its public-facing static-site delivery
path — `ContentItem`/`ContentVersion`, publishing workflow, approval
framework, Page/Initiative/NEC/Blog and Event-**content** types,
`MediaAsset`, the public read snapshot, and the Angular editor shell —
**without** beginning event operations (registration, check-in,
certificates), succession automation, Control Room retirement, or any
production deployment.

## Required human decisions (block Phase 2 development)

```text
[x] CMS content model approved — Option B (typed relational detail models),
    per ADR-011-CMS-CONTENT-MODEL.md and 20_CMS_CONTENT_MODEL.md.
    STATUS: ACCEPTED (session override, 2026-09-28 — see "Override record").

[x] ADR-002 ratified — public content pipeline (CMS → published snapshot →
    Angular build/prerender → Cloudflare Pages), per the readiness note
    added to 02_SYSTEM_ARCHITECTURE.md.
    STATUS: ACCEPTED (session override, 2026-09-28 — see "Override record").

[ ] F9 session model decided — code implements a 12-hour sliding/idle
    session only; docs/ARCHITECTURE_DECISION_RECORD.md promises a 7-day
    absolute cap, shorter admin sessions, and rotation on privilege change.
    Choose: (A) implement the documented model, or (B) formally revise the
    ADR to match the simpler shipped model.
    STATUS: HUMAN DECISION REQUIRED (neither option chosen).
    Relevant before Phase 2 introduces new privileged roles (editors,
    Faculty Advisor) whose session behavior compounds this gap.

[ ] N-3 ApprovalRule policy decided — which content types/verticals/event
    kinds require faculty approval at first CMS publish. Default (no
    faculty approval, one ORGANIZATIONAL stage) applies until configured.
    STATUS: NOT DETERMINED. DECISION OWNER: HUMAN. DECISION REQUIRED: YES.

[ ] N-4 Faculty Advisor identity confirmed — public site and legacy
    Control Room name different people (Dr. Venketalakshmi/Dr. Vijay
    Vardhan vs. Dr. Shripriya/Dr. Vijaykumar). No identity is assumed here.
    STATUS: NOT DETERMINED. DECISION OWNER: HUMAN. DECISION REQUIRED: YES.
```

The engineering recommendation for both the CMS content model and ADR-002 is
already stated in `20_CMS_CONTENT_MODEL.md` and the ADR-002 readiness note —
but a recommendation is not an authorization. Each item above needs the
project owner's explicit approval, override, or answer before the
corresponding Phase 2 work starts.

## Non-blocking decisions (block deployment or institutional seeding, not development)

```text
[ ] N-1 hosting/account ownership — gates first staging/production deploy,
    not Phase 2 coding.
[ ] N-2 authoritative verticals — gates production seed of verticals/heads,
    not Phase 2 coding.
[ ] N-5 initial Super Admins — gates first production login, not Phase 2
    coding.
[ ] N-6 GitHub/infrastructure ownership — recommended before CI hardening,
    not a Phase 2 development blocker.
[ ] N-7 turnover month — gates academic-year rollover (Phase 4), unrelated
    to Phase 2.
[ ] N-8 custom domain — no Phase 1 or Phase 2 impact either way.
[ ] N-9 Python-capable successor staffing plan — tracked risk, revisited at
    Technical Head handover.
```

**The distinction is explicit:** the five items in the blocking checklist
above must be decided before Phase 2 *implementation* begins in earnest,
because they determine the shape of the schema (CMS model fork), the target
architecture being built toward (ADR-002), and the concrete configuration
needed to exercise the workflow end-to-end (N-3/N-4) and to close the one
outstanding security item (F9). The seven items in the non-blocking
checklist gate *deployment* or *institutional data seeding*, not the
development work itself — Phase 2 code can be written and tested locally
without them.

## What is explicitly NOT authorized by this document

- Any Phase 2 application code, migrations, or schema changes.
- Any production deployment of the backend or frontend.
- Any change to Cloudflare, Render, Neon, GitHub, or Supabase configuration.
- Marking ADR-002, ADR-011, or ADR-012 as ACCEPTED — that requires the
  project owner's explicit ratification, not this document's existence.

## Gates summary

```text
Phase 1 merged, CI green, F3/F4/F5/F8/F13 closed                 ✅ confirmed
         │
         ├─ needs CMS model decision (ADR-011)   ─► Phase 2 schema work starts
         ├─ needs ADR-002 ratification            ─► Phase 2 public pipeline work starts
         ├─ needs F9 decision                     ─► Phase 2 privileged-role rollout
         ├─ needs N-3, N-4                        ─► first real CMS publish w/ faculty approval
         └─ needs N-1, N-2, N-5, N-6, N-7, N-8, N-9 ─► deployment / production seeding (separate gate)
```

Phase 2 still requires the project owner's explicit decisions on the five
blocking items above before implementation begins.
