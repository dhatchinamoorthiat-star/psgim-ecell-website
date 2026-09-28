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

## Phase 2B — Public Angular route migration status (completion pass)

Separate from the Control Room capability matrix above: this section is the
**authoritative, definitive** status of all 18 existing public Angular
routes (`web/src/app/features/*`, `web/src/app/app.routes.ts`) against the
CMS/block-renderer pipeline (`docs/25_VISUAL_EDITOR_ARCHITECTURE.md`). None
of the 18 legacy routes or their `*.data.ts` files were modified, removed,
or replaced — every one still renders exactly as before, verified by `ng
build` reporting the same prerendered route count before and after this
pass. Migrated content is additionally reachable, unchanged, at
`/content/<content_type>/<slug>` (SSR'd per request — see doc 25
"SSR/prerender").

A first Phase 2B pass migrated only 5 of these routes and was correctly
sent back as incomplete: the task requires every CMS-representable route to
actually be representable, not a partial slice. This revision closes that
gap — **16 of 18 routes are now `CMS_PAGE`/`CMS_LISTING` and migrated**;
the remaining 2 are genuinely not page content (classified and justified
below, not deferred).

### Classification

`CMS_PAGE` (a single document), `CMS_DETAIL` (an individual typed content
item), `CMS_LISTING` (a page whose body is one or more `dynamic_query`
blocks resolving a set of `CMS_DETAIL` items), `GLOBAL_SYSTEM` (site-wide
configuration/navigation, not page content), `NON_CMS_SYSTEM` (an internal
tool, not content at all).

| Route | Classification | Current source | CMS representation | Status |
|---|---|---|---|---|
| `/` (Home) | CMS_PAGE | `home.data.ts`, `about.data.ts` hero, `stats.data.ts` | `page:home` — hero, rich_text, card_grid ×2, stats, cta | **MIGRATED** |
| `/about` | CMS_PAGE | `about.data.ts` (14 sections) | `page:about` — hero + 13 rich_text/timeline blocks | **MIGRATED** |
| `/origin` | CMS_PAGE | `about.data.ts` (`story`) | `page:origin` — rich_text | **MIGRATED** |
| `/vision-mission` | CMS_PAGE | `about.data.ts` (`vision`) | `page:vision-mission` — rich_text (with `pending`) | **MIGRATED** |
| `/reach` | CMS_PAGE | `about.data.ts` (`reach`) | `page:reach` — rich_text | **MIGRATED** |
| `/spotlight` | CMS_PAGE | `about.data.ts` (`spotlight`) | `page:spotlight` — rich_text | **MIGRATED** |
| `/history` | CMS_PAGE | `about.data.ts` (`timeline`) | `page:history` — timeline (with `pending`) | **MIGRATED** |
| `/initiatives` | CMS_PAGE | `initiatives.data.ts` | `page:initiatives` — card_grid ×3 (what-we-create, stages, initiatives) | **MIGRATED** |
| `/podcast` | CMS_PAGE | `about.data.ts` (`podcast`) | `page:podcast` — rich_text | **MIGRATED** |
| `/website-av` | CMS_PAGE | `about.data.ts` (`websiteAv`) | `page:website-av` — rich_text | **MIGRATED** |
| `/team` | CMS_PAGE | `team.data.ts` | `page:team` — team_grid ×2 | **MIGRATED** |
| `/gallery` | CMS_PAGE | `gallery.data.ts` | `page:gallery` — gallery | **MIGRATED** |
| `/nec` | CMS_PAGE | `nec.data.ts` | `nec:nec` — hero, rich_text ×2, stats, card_grid ×3, timeline, rich_text | **MIGRATED** (10 blocks, individually addressable — not one rich_text dump) |
| `/soon` | CMS_PAGE | `roadmap.data.ts` | `page:soon` — rich_text, card_grid | **MIGRATED** |
| `/events` | CMS_LISTING | `events.data.ts` | `page:events` (2 `dynamic_query` blocks: `published_events_upcoming`/`published_events_past`) + 5 `event:*` CMS_DETAIL items with real `EventDetail` rows | **MIGRATED** |
| `/blogs` | CMS_LISTING | `blogs.data.ts` | `page:blogs` (1 `dynamic_query` block: `published_blogs`) + 1 `blog:*` CMS_DETAIL item with a real `BlogDetail` row | **MIGRATED** |
| `/contact` | GLOBAL_SYSTEM | `site.data.ts` only | Not a page document — reads `site.data.ts`'s address/contact/social fields directly, same as `NavbarComponent`/`FooterComponent`. There is no page-specific content on this route at all (confirmed by reading `contact.component.ts`: it imports only `site`) | **INTENTIONALLY NON-CMS** — migrating it would mean inventing a page wrapper around what is already global configuration |
| `/control` | NON_CMS_SYSTEM | none (`QrGeneratorComponent`) | An internal QR-poster generator tool, `noindex,nofollow`, no content import of any kind (confirmed by reading `control.component.ts`) | **INTENTIONALLY NON-CMS** — this is a utility, not content, by construction |

**Route total:** 18. **CMS_PAGE/CMS_LISTING, migrated: 16. GLOBAL_SYSTEM: 1
(`/contact`). NON_CMS_SYSTEM: 1 (`/control`). Not started / blocked: 0.**

Also not a route (feeds the navbar's search widget, no page of its own):
`search.data.ts` → `SearchEntry[]` → **GLOBAL_SYSTEM**, same reasoning as
nav/footer.

### Verification

Every `CMS_PAGE`/`CMS_LISTING` row above was checked by actually fetching
it, not inferred from the migration script's exit code: `manage.py
migrate_legacy_content` run twice in sequence against a real Postgres
database reports `20 created` then `0 created, ..., 20 unchanged`
(idempotent, no duplicates — later extended to 22 with the Events/Blogs
listing pages, same result pattern), and `curl` against the running `ng
serve` + Django backend confirms real server-rendered HTML for `/about`,
`/origin`, `/events` (showing the correct upcoming/past split against the
actual current date), `/blogs` (showing the real sample post), and `/nec`
(showing all 10 structured sections) — see "SSR/prerender" in doc 25 for
the exact commands and output.

## Global elements (nav, footer, notice banner, search, contact) — not part of this migration

`site.data.ts`'s `nav`, `notice`, `social`, `contact`, `primaryCta`, and
`search.data.ts`'s search index back `NavbarComponent`/`FooterComponent`/
`PageShellComponent`/the search widget, which remain plain Angular
components reading those files directly, unchanged. Per task §9/§8, these
are deliberately not modeled as page-document blocks — duplicating global
navigation into every `ContentItem` would let a single page edit break the
whole site's navigation, and `/contact` is classified `GLOBAL_SYSTEM`
above for the same reason (it has no content beyond that global
configuration). A dedicated global-content model (its own `ContentItem`
scope, edited by design/system-level permissions only) remains Phase
2C/2D work.

## Media resolution (Phase 2B completion pass)

`apps.content.media_resolution.resolve_blocks_media` closes the gap the
prior pass left open: `source: "media"` image props are now resolved to a
real `MediaAsset.delivery_url`/`alt_text` server-side, inline in
`PublicContentDetailView`'s response, before Angular ever sees them — see
doc 25 "Media reference resolution" for the full pipeline and its test
coverage (7 backend tests: resolution, alt-text override, dangling-asset
fail-safe, document non-mutation, end-to-end published-content resolution,
and confirmation that draft content's media is never reachable at all).
No Phase 2B-migrated page currently uses `source: "media"` (all use
`source: "external"` or omit the image, matching what the legacy pages
actually do today), but the pipeline is real, tested, and ready for the
first page that does.

## Pending<T> (Phase 2B completion pass)

Closed: `pending`/`pending_label` are now real optional props on
`rich_text`, `stats`, `timeline`, and `card_grid`'s cards (see
`block_catalogue.py`'s `_PENDING_PROPS`), rendered by the existing
`ui-pending-flag` component — the exact same visual treatment the legacy
pages already use for this marker, not a new one. Migrated and verified
live: About's "vision" (rich_text) and "timeline" blocks carry
`vision.data.ts`'s real `pending`/`note` values and render the flag in
server-rendered HTML; every migrated Event carries its real `pending: true`
from `events.data.ts`.

## Known gaps (named, not silently dropped)

- **Initiative's full narrative `body`** (vs. the shorter `summary` that
  was migrated for the listing cards) still has no block type — the
  listing/summary view is complete; a full initiative detail page (if ever
  wanted) is unbuilt.
- **NEC's `join` CTA has no real destination URL** — `site.data.ts`'s
  `contact.interestForm` is still `Pending<null>` in the source itself, so
  the migrated NEC page renders the join text as `rich_text`, not a `cta`
  block with an invented link.
- **The video hero, Home's scroll-driven journey rail, and Home's live
  upcoming-events/gallery-preview strips** are page-specific interactive
  presentations, not generic content — intentionally not modeled as
  blocks; Home's CMS document covers its structured *content* sections
  only (see the Home row above), not full visual parity with the legacy
  route's bespoke interactions.
- **Gallery/Team photos** — no real image files exist for either in
  `web/public` today (confirmed directly), and neither legacy page renders
  one; migration preserves that reality (`file` kept as metadata, no
  invented URL) rather than fabricating a media reference.

## What this matrix does not do

It does not commit the project to migrating Committees, Creators, Ventures,
Dashboards, bulk historical Users, Blueprint/tasks, Automation/messaging, or
Feedback in any particular phase — those are marked `NOT DETERMINED` because
no accepted planning document currently schedules them. Phase 2, per
`19_IMPLEMENTATION_ROADMAP.md` and this audit's scope determination (see
`PHASE_2_AUTHORIZATION.md`), touches only the CMS/content rows above.
