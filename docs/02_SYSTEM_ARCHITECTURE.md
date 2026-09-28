# 02 — System Architecture

Status: **Superseded as the decision record by `ARCHITECTURE_DECISION_RECORD.md`** (2026-09-25). ADR bodies below remain the detailed rationale.

## 1. Surfaces

```
                     psgim-ecell domain (Cloudflare)
 ┌───────────────────────────────┬──────────────────────────────┐
 │ PUBLIC WEBSITE  /             │ PLATFORM  /platform/...      │
 │ Angular, prerendered HTML     │ Angular, client-rendered,    │
 │ brand/editorial UI            │ lazy-loaded, noindex         │
 └──────────────┬────────────────┴──────────────┬───────────────┘
                │ build-time fetch               │ same-origin XHR
                ▼                                ▼
          /api/*  (Pages Function → reverse proxy, same origin)
                               │
                               ▼
                 Django + DRF (modular apps)  ── cron tick ◄── scheduler
                               │
                  PostgreSQL        Cloudinary (media)     Email (SMTP/API)
```

Responsibilities are kept separate: **PUBLIC WEBSITE** (read-only published
content), **PLATFORM** (members' operational UI), **CMS** (a module of the
platform + content app in Django), **RBAC** (Django `rbac` app, authoritative),
**EVENT OPERATIONS** (events/workstreams/tasks/requests apps),
**TECHNICAL INFRASTRUCTURE** (Cloudflare, hosting, DB, secrets — Technical only).

## 2. Architecture Decision Records

### ADR-001 — What happens to the existing `ecell/` Control Room? — **ACCEPTED 2026-09-25: incremental migration to Django** (row A below; called "Option B" in `ARCHITECTURE_DECISION_RECORD.md` §B, which is authoritative)

The audit found a working Next.js + Supabase platform with auth, MFA, events,
registration, check-in, requests, audit log and academic years.

| Option | Pros | Cons |
|---|---|---|
| **A. Target stack per brief:** Angular + Django/DRF + Postgres; port Control Room features and data into it | One frontend framework; permission-based RBAC from the ground up; matches brief; Django admin is a free back-office for Technical | Re-implements working features (check-in, MFA, attribution); needs a Python host |
| B. Keep Supabase as backend, rewrite Control Room UI in Angular | Reuses schema, RLS, auth | RBAC logic lives in SQL policies — hard for students to maintain; no Django |
| C. Keep Control Room as-is (Next.js), only make public site CMS-driven from Supabase | Least work | Two frameworks forever; enum-ladder roles contradict brief §07–08 |

**Recommendation: A**, executed incrementally. The Supabase schema is the
reference model for the Django apps (it encodes real operational knowledge),
~~and Supabase's Postgres can even be the initial Django database host~~
(superseded by ADR-008: the target DB is a separate Neon Postgres; Supabase
stays the legacy source and data moves by ETL scripts). The Control
Room keeps running until each feature has a verified Django/Angular
replacement — nothing is switched off early.

### ADR-002 — Public site rendering: keep prerender, rebuild on publish — **ACCEPTED 2026-09-28** (session override, see `PHASE_2_AUTHORIZATION.md` "Override record"; originally proposed, readiness-noted 2026-09-27)

The public site stays **static prerendered HTML** (fast, SEO, free). The
prerender step fetches *published* content from the API instead of
importing `*.data.ts`. When content is published (manually or by schedule)
the backend calls a **Cloudflare Pages deploy hook**, which rebuilds in ~2–3
min. Editors never touch Git.

Rejected for now: full SSR on Workers (adds runtime cost/complexity, no need
at this traffic). Revisit if publish-to-live latency of minutes is unacceptable.

Time-sensitive fields (upcoming vs past events) are additionally re-evaluated
client-side after hydration so they are never stale between builds.

**Readiness note (2026-09-27, Phase 1→Phase 2 audit):** verified consistent
with the actual repository and production state — the public site is
already deployed as static prerendered HTML with no runtime backend
dependency, and no evidence of an alternative (runtime-API or ISR) pipeline
exists anywhere in the codebase. No new analysis changes this proposal.

```text
STATUS: ACCEPTED (2026-09-28)
```

Accepted by the project owner via the session override recorded in
`PHASE_2_AUTHORIZATION.md`. Phase 2A (this session) builds the public
read-only content endpoint this pipeline will consume
(`GET /api/v1/content/public/<content_type>/<slug>`) but does **not** wire
it to the Angular prerender step or add any Cloudflare deploy-hook call —
that remains Phase 2B/2E.

### ADR-003 — Cloudflare Pages, not Workers Static Assets — ACCEPTED (see also `ADR-009-CLOUDFLARE-DEPLOYMENT.md`)

Current deployment is Pages with `wrangler pages deploy`. Cloudflare now steers
*new* projects toward Workers + Static Assets, but Pages is supported and fits
a prerendered SPA plus one proxy Function. Migrating buys nothing today. Re-check
current Cloudflare docs before Phase 5; if Pages is deprecated, the move is a
config change (`wrangler.jsonc` with `assets.directory`). Documented in `16_DEPLOYMENT.md`.

### ADR-004 — Same-origin API via Pages Function proxy — PROPOSED

`functions/api/[[path]].ts` forwards `/api/*` to the Django host. Benefits:
first-party cookies (`SameSite=Lax`, `HttpOnly`, `Secure`), no CORS, CSRF via
Django's standard double-submit token. Cost: one tiny Function (free tier:
100k requests/day — **verify current limit**). Fallback if it causes trouble:
`api.<domain>` subdomain with cookie `Domain=` scoped to the parent.

### ADR-005 — Session auth, not JWT — PROPOSED

Django sessions in Postgres + CSRF. Simpler to revoke, no token storage in
the browser, fits same-origin. JWT is not needed for a first-party SPA.

### ADR-006 — No Redis/Celery in V1 — PROPOSED

Scheduled publishing, deadline reminders and notification emails run from a
**cron tick**: a Cloudflare Worker Cron Trigger (or GitHub Actions schedule)
calls `POST /api/internal/tick` every 5 min with a shared secret. The tick
runs idempotent jobs recorded in a `JobRun` table. Add Celery+Redis only when
a job exceeds a request timeout.

### ADR-007 — One Angular workspace, two route trees — PROPOSED

The platform is added to the existing `web/` Angular app under
`/platform/**`, lazy-loaded, excluded from prerender (`RenderMode.Client`),
with its own layout shell and a denser UI tokens layer. Public bundles never
load platform code. Tailwind is **not** introduced into the public site (it
has a mature token/CSS system); the platform may use it only if the
Technical Head accepts the extra dependency — default is to extend the
existing tokens (see `14_DESIGN_SYSTEM.md`).

### ADR-008 — Backend hosting — **ACCEPTED 2026-09-25**. See `ADR-008-BACKEND-HOSTING.md` (Render paid + Neon; fallback Cloud Run). The candidate list below is kept for history

Candidates (free/low tier; **all limits must be re-verified at decision time**):
Render (free web service sleeps when idle), Koyeb, Google Cloud Run (free
monthly quota, scales to zero), PythonAnywhere. Postgres: Supabase (existing),
Neon. Criterion order: free → no credit card → cold-start tolerable → portable
(Docker image). Deliver Django as a Docker image so the host is swappable.

## 3. Django module layout

```
backend/
  config/             settings (base/dev/prod), urls, wsgi
  apps/
    core/             base models (timestamps, soft-delete), utils, tick jobs
    accounts/         User, auth views, password reset, email verification
    rbac/             Role, Permission, RoleAssignment, policy engine
    organizations/    Organization settings (timezone Asia/Kolkata)
    verticals/        Vertical
    memberships/      AcademicYear, Membership, LeadershipAssignment, succession
    content/          ContentItem, ContentVersion, blocks, workflow, publishing
    blogs/ speakers/ events/ registrations/ media/
    projects/ workstreams/ tasks/ requests/
    notifications/ knowledge_base/ analytics/ audit/
```

## 4. Timezone

Store UTC (`USE_TZ=True`). Organization setting `timezone = "Asia/Kolkata"`;
all schedule inputs are interpreted in it and rendered in it.
