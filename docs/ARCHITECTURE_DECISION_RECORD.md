# PSGIM E-Cell Platform — Architecture Decision Record (Baseline)

- **Date:** 2026-09-25
- **Role:** Lead Architect + Technical Project Manager
- **Status:** Architecture **frozen** for Phase 1. Changes require a new ADR.
- **Inputs reconciled:** requirements (`01`) → existing implementation (`00_AUDIT`, repo inspection) → proposed architecture (`02`–`14`) → migration plan (`15`).

> Doc-name note: the brief refers to some docs by other names (e.g.
> `03_RBAC_PERMISSION_MATRIX.md`, `09_API_CONTRACT.md`). The actual files are
> listed in `docs/README.md`. Content is the same; only the numbering differs.

---

## A. Current State

Everything in this section is **CURRENT** (verified in the repo or on the live
site on 2026-09-25). **PROPOSED** items appear only in later sections.

### A.1 Public website — CURRENT

| Aspect | Current state |
|---|---|
| Angular version | **22.1** (`@angular/core ^22.1.0`; live site reports `ng-version="22.1.7"`) |
| Style | standalone components, signals, lazy `loadComponent` per route, custom `TrailingSlashUrlSerializer` |
| Routing | `web/src/app/app.routes.ts`: **18 routes** plus `**` → `/`. Public: `/`, about, origin, vision-mission, reach, spotlight, history, initiatives, podcast, website-av, events, blogs, team, gallery, nec, contact, soon; internal: `/control/` (noindex, **not access-controlled**) |
| SSR / prerender | `@angular/ssr` used for **build-time prerender only**. `app.routes.server.ts`: `RenderMode.Prerender` on `**`. Build: "Prerendered 18 static routes". `server.ts` exists but no server runs in production |
| Content architecture | All content hard-coded in `web/src/app/core/data/*.data.ts` (13 files), typed by `core/models/models.ts`. `pending: true` renders a *to be confirmed* marker |
| Deployment | Cloudflare **Pages, Direct Upload**, deployed from a laptop with `npm run deploy`. **No CI.** |
| Pages config | `wrangler.toml`: `name = "psgim-ecell"`, `pages_build_output_dir = "web/dist/web/browser"`, `compatibility_date = "2026-09-22"` |
| Wrangler | invoked via `npx wrangler pages deploy … --branch ECell --project-name psgim-ecell` |
| Production branch | **`ECell`**, a Direct Upload *label*, **not a Git branch** (Git has only `main`, `origin/test`). See ADR-009 |
| Headers / SEO | `web/public/_headers` (served live), `postbuild.mjs` writes `sitemap.xml` and `robots.txt` |
| Design system | `web/src/styles/tokens.css`: logo-sampled navy `#002050` and turquoise `#00b098`, Montserrat, fluid type scale, light/dark via `[data-theme]`. See `14_DESIGN_SYSTEM.md` |
| Tests | none. `ng test` currently errors on target configuration (no spec files) |
| Repo owner | `github.com/dhatchinamoorthiat-star/psgim-ecell-website` (personal account) |

### A.2 Control Room — CURRENT

| Aspect | Current state |
|---|---|
| Location | `ecell/`, a **separate Git repo** (`dhatchinamoorthiat-star/E-Cell`, personal account), git-ignored by the website repo |
| Framework | Next.js 16.3, React 19, Tailwind 4, zod |
| Auth | Supabase Auth: password + magic link, forgot/reset, **second factor (6-digit PIN or emailed code) for every non-public role**, 12 h signed cookie |
| Database | Supabase Postgres, **20 migrations**, **81 RLS policies**, about 40 tables and 15 views |
| Capabilities | events (`activities`) with faculty review, registration with permanent participant IDs, NEC attribution, offline QR check-in, sessions/attendance, certificates, feedback, speakers, teams (verticals) per academic year, blueprints → requests, Cloudinary media, notifications, audit log, `site_content` key/value, creators |
| Permission model | **single enum ladder** `public < member < core < faculty < admin < super_admin`, with `canX(role)` helpers in TS and `is_faculty()` checks in RLS. The DB trigger `guard_role_change()` restricts privileged role grants to super admin |
| Deployment | Vercel (`vercel.json`); **uncommitted** OpenNext → Cloudflare Workers config (`wrangler.jsonc`). Production URL **UNVERIFIED** |
| Relation to public site | **None at runtime.** Different framework, repo, host and data. The public site does not read from Supabase, and the Control Room has its own public-style pages (`/about`, `/events`, …) that duplicate the Angular site |

---

## B. Decision 1 — Control Room Migration

### Options
- **Option A:** keep Supabase as the **permanent** backend (Postgres + RLS + Supabase Auth). New Angular UI on top.
- **Option B:** migrate **incrementally** to Django + DRF + PostgreSQL. The Control Room runs until each feature reaches parity.

### Trade-off analysis

| Criterion | Option A — Supabase permanent | Option B — Django incremental |
|---|---|---|
| RBAC complexity | Scoped, permission-based RBAC (user × role × vertical/event scope) has to be expressed in **RLS policies and SQL functions**. That's possible, but every rule is duplicated between SQL and client code. 81 policies already exist for a *simpler* ladder model | One policy engine in Python (`has_perm(user, perm, obj)`) used by every view. Scope logic lives in one place and is unit-testable |
| Maintainability by students | Needs SQL/RLS fluency, which is rare among students and hard to debug (silent empty result sets instead of errors) | Django is widely taught. Its conventional structure, admin and ORM are well documented. Needs Python, which is a **new** skill for this team (current code is all TypeScript) |
| Authentication | **Stronger today**: working password, magic link, reset and second factor, already used by the team | Must be rebuilt. Django's built-in auth plus sessions is mature, but the PIN/second factor has to be ported |
| Auditability | Audit log exists but is written by app code in some paths. Direct DB writes via the service-role key bypass it | Audit writes happen inside the same service-layer transaction. A single write path makes it enforceable |
| Business rules / workflow | Split across triggers, RLS and Next server actions | Centralised in service functions with explicit state machines (content workflow, requests, succession) |
| Database control | Managed and convenient, but free projects **pause after 1 week idle** and have no free backups | Full control of schema and migrations (Django migrations). The host is swappable (plain Postgres) |
| Migration risk | Low. No rewrite | **Real.** Working features (check-in, attribution, MFA) must be re-implemented. Mitigated by the parity-gated, feature-by-feature approach below |
| Operational complexity | Lower: one managed service, no server | Higher: an app server, DB, proxy and cron. Mitigated by the minimal V1 infrastructure (ADR-006, ADR-008) |
| Developer availability | TS/React developers exist on the team now (the Control Room author) | Requires at least one Python-capable Technical member each year. Django is a common curriculum skill, but **this is a staffing risk to track** |
| Long-term institutional ownership | Vendor-specific (Supabase Auth, RLS, storage), and the account is personal | Portable. Any Postgres plus any container host |
| Annual handover | A successor must understand RLS, triggers, Supabase config **and** a second frontend framework | One frontend framework (Angular), one backend, docs map 1:1 to Django apps |

### Decision — **Option B: migrate incrementally to Django + DRF + PostgreSQL**

The deciding factors are the brief's hard requirements. Scope-aware permission
RBAC (§07–08), enforced workflows and approvals (§14), an append-only audit
trail (§27) and escalation tests (§58) all fit a single application-layer policy
engine much better than RLS. So does a single frontend framework, which makes
the yearly handover easier (§67). Option A's real advantages are working auth,
lower operational cost and zero rewrite risk. They're kept by **not switching
anything off early** and by porting the Control Room's proven designs (MFA,
no-oracle password reset, offline check-in, attribution) instead of reinventing them.

> **Supabase/Control Room is a legacy operational system during migration, not
> the target architecture.**

### Migration principle — **No big-bang rewrite**
1. The Control Room stays in production, unchanged, until each of its capabilities has a Django/Angular replacement that **passes parity testing** (the feature checklist plus a data reconciliation in `15_MIGRATION_PLAN.md`).
2. Migration happens **feature by feature**, in this order: CMS/public content → events/speakers/media → requests/blueprints → registration/attribution/check-in (last, because event days depend on it).
3. Each feature cut-over is its own reversible step. The old route is kept read-only for one event cycle.
4. Data moves by versioned ETL scripts (`manage.py import_controlroom_<area>`) that are idempotent and re-runnable, with row-count and checksum reconciliation.
5. No new features are added to the Control Room except critical fixes, and the schema is frozen.

---

## C. Decision 2 — Backend Hosting

Full analysis: **`ADR-008-BACKEND-HOSTING.md`**.

- **Primary:** Render **paid** web service ($7/month), Docker image, plus **Neon** Postgres (Free, no card), plus a daily `pg_dump` to Cloudflare R2.
- **Fallback:** Google Cloud Run + Neon (same image).
- **Not production:** Render Free. The vendor says so itself: 15 min spin-down, 750 h/month cap.
- **Scheduled jobs:** Cloudflare Worker Cron Trigger → `POST /internal/tick` (every 5 min).
- Needs human approval of about **$7/month** and an E-Cell-owned account (non-blocking for Phase 1 coding; blocking for the first staging/production deploy).

## D. Decision 3 — Organizational Verticals

Full analysis: **`ORGANIZATIONAL_STRUCTURE.md`**. Four sources disagree (brief: 6;
Control Room seed: 6 *different* names; public site: "seven", unnamed;
team roles: 6). **DECISION REQUIRED FROM E-CELL LEADERSHIP** for the
production seed. The architecture treats verticals as **data** (`Vertical` rows,
archive not delete, scoped `RoleAssignment`s), so this doesn't block Phase 1
implementation.

## E. Decision 4 — Faculty Approval Authority

Evidence: the Control Room made faculty approval mandatory for activities
(`0002_rls.sql` trigger, "only faculty may approve or reject activities"). The
public site has no approval step. There is no authoritative current policy.

**Decision:** faculty approval is **configurable governance**, not architecture.
`ApprovalRule` (spec in `07_CONTENT_WORKFLOW.md`) supports: no faculty approval
(default); faculty approval per content type, per vertical, per event kind; and
multi-stage (organizational then faculty). There are three separate kinds of authority:
**organizational approval** (`content.approve`), **faculty approval**
(`content.approve_faculty`, held only by `FACULTY_ADVISOR`) and
**technical/platform authorization** (`system.settings`, `content_type.manage`).
Technical roles hold no approval permissions.

Recommended initial configuration (for leadership to confirm or change **at
runtime**, not in code): *mirror the Control Room*, meaning faculty approval is
required for `event` content and not for blogs or announcements.

## F. Decision 5 — `/blogs/` Work in Progress

| Question | Finding |
|---|---|
| State | Uncommitted: 4 modified tracked files plus 2 untracked paths. Nothing staged, nothing ignored |
| Complete? | Yes. Route, nav, search entry, model, data (1 sample post, `pending`) and component |
| Experimental? | No. **It was already live in production** (`/blogs/` served "Blogs — PSGIM E-Cell"), deployed from the working tree |

**Action taken:** committed on its own as `2e91ae7 Add the Blogs page (already live
on production)`, separate from the architecture work. `.claude/launch.json`
(local dev-tool config adding the Control Room dev server) is **left
uncommitted**. It's personal tooling, not product code.

## G. Cloudflare Branch Model

Full analysis: **`ADR-009-CLOUDFLARE-DEPLOYMENT.md`**. `main` is the source
branch. `ECell` is only the Pages production *label* on Direct Upload
deployments. Target pipeline: `main` → GitHub Actions (lint/test/build, clean-tree
check) → `wrangler pages deploy --branch ECell`. Nothing is renamed or reconfigured now.

---

## H. Final Target Architecture (PROPOSED → accepted baseline)

```text
USER (browser, phone-first)
 │
 ├── Public Website  ───────────────────────────  psgim-ecell.pages.dev/  (custom domain later)
 │       │
 │       └── Angular 22, prerendered static HTML (RenderMode.Prerender)
 │                │   content = published snapshot fetched at build time
 │                └── Cloudflare Pages (Direct Upload, label ECell) ◄── GitHub Actions
 │                                                                        ▲
 │                                                 repository_dispatch on publish
 │
 └── Authenticated Platform  ───────────────────  /platform/**  (noindex, RenderMode.Client)
         │
         └── Angular /platform (lazy route tree, same app, platform UI layer)
                  │  same-origin XHR, session cookie + CSRF header
                  └── /api/*
                       │
                       └── Cloudflare Pages Function (reverse proxy, same origin)
                                │
                                ▼
                  Django + DRF (Docker on Render; fallback Cloud Run)
                    apps: accounts · rbac · verticals · memberships · content ·
                          blogs · events · speakers · media · registrations ·
                          projects/workstreams/tasks/requests · notifications ·
                          knowledge_base · analytics · audit · core
                                │
             ┌──────────────────┼────────────────────┬───────────────────┐
             │                  │                    │                   │
      PostgreSQL (Neon)   Cloudinary (media,   Email provider     GitHub API
      source of truth     signed direct        (reset, verify,    (trigger site
             │            uploads)             digests)           rebuild)
             │
             └── RBAC · Audit (append-only) · CMS versions · Events ·
                 Workflows · Academic years · Knowledge Base

Cloudflare Worker Cron (every 5 min) ──► POST /internal/tick (secret)
   → scheduled publish/unpublish · deadline reminders · digests · backups trigger

LEGACY (until parity): Control Room (Next.js + Supabase)  ──ETL scripts──► Django DB
```

### Cross-cutting design

| Concern | Decision |
|---|---|
| **Authentication** | Django auth, custom `User` (email login) from the first migration. Argon2 password hashing. Email verification for new accounts. Forgot/reset with no account oracle (always 202, as in the Control Room). Login rate limit (5/min per IP+email). Second factor (PIN or email code) for privileged roles, ported from the Control Room in Phase 1b |
| **Session management** | Server-side Django sessions in Postgres. Cookie `HttpOnly; Secure; SameSite=Lax; Path=/`. 12 h idle / 7 d absolute for members, shorter for admin roles. Session rotation on login and privilege change. Logout-everywhere on password reset |
| **CSRF** | Django CSRF middleware. SPA reads the token from `GET /api/v1/auth/csrf` and sends `X-CSRFToken` on unsafe methods. `CSRF_TRUSTED_ORIGINS` = the site origin only. No CORS (same origin) |
| **RBAC** | `User → RoleAssignment(role, scope, academic_year, start/end) → Role → Permission`. Roles are bundles, verticals are scopes, **no ladder**. See `03_RBAC_MODEL.md` |
| **Permissions** | Granular code strings (`event.edit`, …). Every DRF view declares `required_perm`. A test fails if any URL lacks a declaration. Matrix in `04_PERMISSION_MATRIX.md` |
| **Scope resolution** | `has_perm(user, perm, obj)`: GLOBAL, VERTICAL (owner or contributing), EVENT, PROJECT, OWN. Implemented once in `rbac/policy.py`. List endpoints filter querysets by the same resolver |
| **CMS** | Structured entities first (Event, Blog, Speaker, Initiative, TeamProfile, Gallery). Block lists only for page bodies. Block types are owned by Technical. See `06` |
| **Publishing** | Draft/published version pointers. Public API reads published only. Workflow and ApprovalRules in `07`. Publish triggers a debounced site rebuild via GitHub `repository_dispatch` |
| **Scheduled jobs** | Cloudflare Cron → `/internal/tick`. Idempotent jobs, `SELECT … FOR UPDATE SKIP LOCKED`, `JobRun` log. No Redis/Celery in V1 |
| **Audit logging** | Append-only table (UPDATE/DELETE revoked). Written in the same transaction as the change, including DENIED attempts. Filterable UI. See `09` |
| **Media** | Cloudinary, signed direct browser uploads. DB stores metadata only. Alt text required before publish. Nothing large in Git |
| **Academic years** | `AcademicYear` rows. Memberships, assignments and events are year-bound. One current year (DB constraint). See `10` |
| **Succession** | Guided transfer: end the incumbent's assignment, start the successor's with `predecessor_id`, reassign pending work, handover notes, and an infrastructure checklist for Technical Head. Nothing deleted. See `10` |
| **Knowledge base** | Per-vertical plus org-wide versioned markdown articles, Postgres full-text search, review-due reminders. Survives turnover because it's owned by verticals, not people. See `11` |
| **Event operations** | Event with exactly one owner vertical and many contributors. Workstreams per vertical, tasks, cross-vertical WorkRequests, workspace. See `08` |
| **Control Room migration** | Parity-gated, feature by feature, ETL scripts with reconciliation. Legacy stays live until cut-over. See §B |

---

## NON-NEGOTIABLE ARCHITECTURAL PRINCIPLES

Each principle has an enforcement mechanism. A principle without one is a wish.

| # | Principle | Enforced by |
|---|---|---|
| 1 | Technical owns platform/infrastructure authority, **not** organizational sovereignty. | Technical roles have no `content.approve*`, `role.assign` or `vertical.manage` by default (permission seed + test) |
| 2 | Vertical Heads control their operational content within scope. | VERTICAL-scoped assignments. Scope resolver. Cross-vertical 403 tests |
| 3 | Super Admin controls organization-wide governance. | `role.manage`, `vertical.manage`, `approval_rule.manage` are Super Admin only |
| 4 | Members execute assigned work. | MEMBER permissions limited to OWN/assigned. Task-update tests |
| 5 | Events are cross-vertical operational objects. | `EventVertical` with one owner (DB constraint) and many contributors. Workstreams per vertical |
| 6 | The CMS removes unnecessary technical dependency for content publishing. | Publish → automatic rebuild. Success criterion 1 as an E2E test |
| 7 | Draft content must never leak into public endpoints. | `/public/*` serializers read only `published_version`. Leak tests on every content type |
| 8 | Every privileged action must be auditable. | `audit.record` in service layer, same transaction. Test that asserts an audit row per privileged endpoint |
| 9 | RBAC is permission-based and scope-aware, not a role ladder. | No `role ==` checks (lint rule / grep in CI). Every view declares `required_perm` |
| 10 | Users cannot escalate their own privileges. | Grant ≤ own global permissions. No self-assignment. Privileged roles are Super Admin only. Escalation test suite |
| 11 | Self-approval is prevented. | Approver ≠ author per version, and distinct people per stage (server check + test) |
| 12 | Academic-year succession preserves institutional continuity. | Assignments end instead of being deleted. `predecessor_id`. Historical queries tested |
| 13 | Knowledge remains accessible after leadership turnover. | KB owned by vertical, not user. Accounts become `alumni`, never deleted |
| 14 | Vertical structure is data-driven. | No vertical enum or slug in code (CI grep). Only the `is_platform_custodian` flag |
| 15 | Third-party infrastructure ownership must not depend on one student's personal account. | Owner table in `17_DEVELOPER_HANDOVER.md` §8. At least 2 admins on every service. Org-owned email/GitHub org before production |
| 16 | The existing Control Room stays operational until its replacement passes parity testing. | Parity checklist per feature. Cut-over requires sign-off |
| 17 | No big-bang migration. | Feature-by-feature cut-over plan (§B) |
| 18 | No unnecessary infrastructure dependencies in V1. | No Redis/Celery/queues/search services. New dependencies need an ADR |
| 19 | Public pages remain fast and cacheable. | Static prerender. No runtime API calls for first paint. Lighthouse budget in CI |
| 20 | `/platform/**` is never indexed by search engines. | `RenderMode.Client`, `noindex` meta, `X-Robots-Tag: noindex` header for `/platform/*` in `_headers`, `Disallow: /platform/` in robots.txt, excluded from sitemap |

---

## PHASE 1 STATUS

```text
PHASE 1 STATUS

Architecture: READY
Backend host: SELECTED (Render paid + Neon; fallback Cloud Run) — spend/account approval pending, needed before first deploy, not before coding
Database strategy: SELECTED (PostgreSQL via Django ORM on Neon; Supabase = legacy source only)
Control Room migration strategy: SELECTED (Option B, incremental, parity-gated)
Vertical structure: REQUIRES HUMAN DECISION (list of verticals — needed for production seed, not for Phase 1 code)
Approval model: CONFIGURABLE
Git baseline: CLEAN (blogs committed; only local .claude/launch.json and the uncommitted docs/fixes from this review remain)
Cloudflare deployment model: CONFIRMED (documented; CI to be added in Phase 1b)

FINAL STATUS:
GO — Phase 1 implementation (local development, tests, no deployment) may begin
```

Rationale: the remaining human decisions (vertical list, hosting spend, account
ownership, faculty-rule configuration) are all **data or configuration** under
this architecture. None of them changes a model, API or module boundary. They
gate the *first deployment* and the *production seed*, which
`PHASE_1_AUTHORIZATION.md` tracks as explicit gates. See that file for the
full classification.
