# 22 — Legacy → New Platform Migration Matrix

- **Date:** 2026-09-27
- **Status:** PROPOSED
- **Basis:** direct inspection of the legacy `ecell/` application (Next.js 16 +
  React 19, Supabase auth/DB/storage, Cloudinary media, `qrcode`/`jsqr`,
  deployed via OpenNext to Cloudflare Workers) during the Phase 1→Phase 2
  readiness audit. `ecell/` was not modified.

## Governing principle

> No Control Room capability is retired until the corresponding new
> capability has passed parity testing and cutover approval.

This matrix does not assume every legacy feature must be rebuilt. Several
rows are explicitly marked `NOT DETERMINED — HUMAN DECISION REQUIRED` because
no Phase 2/3 planning document currently commits to migrating them, and
inventing a plan for them here would violate the audit's no-fabrication
constraint.

| Legacy Capability | Legacy Implementation | New Platform Target | Phase | Status | Dependencies | Parity Requirement | Pilot Requirement | Cutover Condition | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Authentication | `ecell/src/lib/auth.ts`, `(auth)/login/*` (Supabase) | Django session auth + CSRF | 1 | **Done** | — | Login, logout, session expiry | Already in production use (platform) | N/A — new system, not a cutover from legacy auth | Distinct systems; Control Room auth is not replaced by platform auth, only paralleled |
| MFA / PIN login | `ecell/src/lib/mfa.ts`, HMAC-signed cookie, PIN/emailed code, lockout | Not yet designed for `/platform` | — | Not started | Auth (done) | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` — no Phase 2/3 doc proposes an MFA equivalent |
| Site copy / CMS-like editing | `ecell/src/lib/site-content.ts`, `admin/content` | `ContentItem` (Page type) | 2 | Planned (design only) | CMS content model (ADR-011) | Editors can reproduce current site copy via CMS | One institutional page migrated and published end-to-end | CMS publish pipeline live; page content parity confirmed | See `20_CMS_CONTENT_MODEL.md` |
| Events (content) | `ecell/src/lib/events.ts`, public listing/detail pages | `ContentItem` (Event type, content only) | 2 | Planned (design only) | CMS content model, ADR-012 (content/operational split) | Public event page parity | One real event's content published via CMS | Event content type ships and one event uses it live | Operational fields (registration, capacity) are Phase 3 — see ADR-012 |
| Event registration | `ecell/src/app/actions/register.ts` | Event operational object → Registration | 3 | Not started | Event content type (Phase 2) | Registration flow parity | — | — | Explicitly out of Phase 2 scope |
| QR check-in | `ecell/src/app/api/checkin/route.ts`, `jsqr`-based desk UI, kiosk page | Event operational object → CheckIn | 3 | Not started | Registration (Phase 3) | Offline-tolerant batch check-in parity | — | — | Explicitly out of Phase 2 scope |
| Certificates | `ecell/src/app/actions/certificates.ts`, public verification page | Event operational object → Certificate | 3 | Not started | Registration, check-in | Certificate issuance + public verification parity | — | — | Explicitly out of Phase 2 scope |
| Media management | `ecell/src/lib/cloudinary.ts`, signed direct uploads scoped by folder | `MediaAsset` (Cloudinary, same provider) | 2 | Planned (design only) | CMS content model | Upload + alt-text-required-before-publish parity | — | MediaAsset model ships with CMS | Reuses the legacy Cloudinary integration pattern, not a new vendor |
| Users | `ecell/src/app/actions/people.ts` (largest action file), `admin/people`, `people-import.ts` | Django `accounts.User` + `memberships` | 1 (identity) / ongoing (import) | Partial | — | Bulk import parity for existing people records | — | — | User creation/RBAC done in Phase 1; **bulk migration of existing Control Room people records is `NOT DETERMINED — HUMAN DECISION REQUIRED`** |
| Teams | `ecell/src/lib/blueprints.ts` / `actions/teams.ts`, `admin/teams` | `Vertical` + `Membership` (Phase 1 done) or a distinct Teams concept | 1 (Verticals) | Partial | — | — | — | — | Phase 1's `Vertical`/`Membership` may or may not be the intended replacement for legacy "Teams" — `NOT DETERMINED — HUMAN DECISION REQUIRED` whether these are the same concept |
| Committees | No dedicated entity found in `ecell/` (informal reference only in an upload-folder comment) | — | — | — | — | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` — legacy system itself has no clear Committees entity to migrate from; clarify whether this maps to Teams/Verticals or is net-new |
| Creators | `ecell/src/lib/creators.ts`, `creator-model.ts`, public + admin pages | — | — | Not started | — | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` — not present in any Phase 2/3 roadmap document |
| Ventures | Not found anywhere in `ecell/` | — | — | N/A | — | — | — | — | No legacy implementation exists to migrate from. `NOT DETERMINED — HUMAN DECISION REQUIRED` whether this is a net-new Phase 3+ concept at all |
| Dashboards | `admin/page.tsx` ("Control room" live tiles from `attribution_live` view), `admin/nec` dashboard | Platform admin dashboard (Phase 1 has only RBAC admin screens) | — | Not started | Relevant data models per dashboard | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` for scope/timing |
| Reporting | `admin/events/[id]/report` | Post-event report (already specified conceptually in `08_EVENT_OPERATING_MODEL.md`) | 3 | Not started | Event operational object | Report parity per event | — | — | Tied to event operations, Phase 3 |
| Requests | `ecell/src/app/actions/requests.ts`, `lib/work.ts` state machine, `admin/requests` | `WorkRequest` (`05_DATA_MODEL.md`) | 3 (per `08_EVENT_OPERATING_MODEL.md` "Work requests") | Not started | Event/vertical model | State machine parity (`REQUESTED → ACCEPTED → IN_PROGRESS → SUBMITTED → REVIEW → COMPLETED`, + `DECLINED`/`BLOCKED`) | — | — | Already specified in doc 08; scheduling relative to Phase 2 CMS work is `NOT DETERMINED` |
| Approvals | Folded into Requests/Onboarding via `canApprove` role predicate (`lib/roles.ts`) — not a standalone legacy module | CMS `ApprovalRule`/`Approval` (Phase 2, content only); WorkRequest approvals (Phase 3, per doc 08) | 2 (content) / 3 (requests) | Planned (content) / Not started (requests) | — | — | — | — | Content approvals and request approvals are separate systems; do not conflate |
| Blueprint / tasks | `ecell/src/lib/blueprints.ts`, `actions/blueprints.ts`, `admin/blueprints` | `Workstream`/`Task`/`TaskAssignment` (`05_DATA_MODEL.md`) | 3 (per doc 08 "Workstreams") | Not started | Event operational object | Task/workstream parity | — | — | Specified conceptually in doc 08, not scheduled into Phase 2 |
| Audit logging | `ecell/src/lib/audit.ts`, `admin/logs` | Django `apps/audit` (Phase 1, append-only, DB-trigger enforced) | 1 | **Done** | — | N/A — new system | — | — | Historical Control Room audit records are not migrated; `NOT DETERMINED — HUMAN DECISION REQUIRED` whether legacy audit history should be imported at all |
| Automation / messaging | `ecell/src/lib/messaging.ts` (Brevo email + WhatsApp templated sends), `admin/automation`, cron tick | Not yet designed | — | Not started | Cron tick infra (ADR-006, shared with CMS scheduling) | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` — not in current roadmap |
| Feedback | `ecell/src/app/actions/feedback.ts`, `pass/[code]/feedback` | Not yet designed | — | Not started | Event operational object | — | — | — | `NOT DETERMINED — HUMAN DECISION REQUIRED` — likely Phase 3, tied to events, not yet committed |
| Blog / resources | `(site)/(contained)/resources/blog`, `resources/contact` | `ContentItem` (Blog type) | 2 | Planned (design only) | CMS content model | Blog listing/detail parity | One legacy post migrated and published | Blog content type ships and one post uses it live | Blog is already specified as a typed extension in `05_DATA_MODEL.md` |
| NEC (undocumented legacy domain) | `ecell/src/lib/nec.ts`/`nec-id.ts`/`nec-domains.ts`, `admin/nec` dashboard, own ID scheme | `ContentItem` (NEC type, content only) | 2 (content) | Planned (design only, content face) | CMS content model | — | — | — | The NEC *dashboard*/ID-scheme/operational side has no Phase 2/3 target yet — `NOT DETERMINED — HUMAN DECISION REQUIRED` beyond the content type name |
| Event-day sessions | `ecell/src/lib/sessions.ts`, kiosk display, session token API | Event operational object (sessions) | 3 | Not started | Event operational object | Session display/token parity | — | — | Out of Phase 2 scope; grouped with registration/check-in |
| Control Room retirement | N/A (currently the system of record for all of the above) | N/A | Explicitly out of scope for Phase 2 and this audit | Not started | Every row above reaching parity + pilot + cutover approval | Full functional parity across all migrated capabilities | Institution-wide pilot period | Explicit written cutover approval from leadership, per capability or in full | See `23_OPERATIONS_MODEL.md` and `24_SUCCESSION_GOVERNANCE.md` for the operational/governance context this depends on |

## What this matrix does not do

It does not commit the project to migrating Committees, Creators, Ventures,
Dashboards, bulk historical Users, Blueprint/tasks, Automation/messaging, or
Feedback in any particular phase — those are marked `NOT DETERMINED` because
no accepted planning document currently schedules them. Phase 2, per
`19_IMPLEMENTATION_ROADMAP.md` and this audit's scope determination (see
`PHASE_2_AUTHORIZATION.md`), touches only the CMS/content rows above.
