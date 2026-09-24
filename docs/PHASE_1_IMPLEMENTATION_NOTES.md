# Phase 1 Implementation Notes

- **Branch:** `platform/phase-1` (from `main` at `94e255f`). **Not merged, not deployed.**
- **Date:** 2026-09-25
- **Scope:** Phase 1a (backend foundation) and Phase 1b (Angular platform shell), as authorized.

This file describes what exists in the code, not plans. Where something was
deferred or could not be verified, it says so.

---

## 1. What was built

### Backend: `backend/` (Django 6.1, DRF 3.18, Python 3.13, PostgreSQL)

| App | Contents |
|---|---|
| `core` | `TimeStampedModel` (UUID pk, timestamps), `OrganizationSettings` singleton (name, timezone default `Asia/Kolkata`), request-id middleware, contract error format (`{"error": {code, message, fields}}`), 409 `Conflict`, page pagination, trusted client-IP helper, JSON CSRF-failure view, OpenAPI views, `GET/PATCH /settings` |
| `accounts` | Custom `User` (email login, normalized and case-insensitively unique, `status` active/inactive/alumni, `email_verified_at`, no `is_superuser`, no role field), auth endpoints, user administration, `end_all_sessions`, throttles, reset/invite emails, dev commands |
| `audit` | Append-only `AuditLog` (ORM update/delete raise `AppendOnlyError`), `audit.record()` (redacts secrets, snapshots actor grants, IP, user agent, request id), `GET /audit` (cursor-paginated, filterable) |
| `verticals` | `Vertical` as data (slug, name, description, order, active/archived, at most one `is_platform_custodian`), CRUD plus archive with typed confirmation |
| `memberships` | `AcademicYear` (DB-enforced single current year), year-bound `Membership` (ends, never deleted), endpoints |
| `rbac` | `Permission`, `Role`, `RolePermission(own_only)`, `RoleAssignment(scope_type, scope_id, academic_year, starts/ends, revoked)`, `catalogue.py`, `policy.py` (the engine), `services.py` (anti-escalation rules R1–R6), `api.py` (per-method permission declarations), `approvals.py` (self-approval guard for Phase 2), `seed_rbac` |

There is no Django admin site, on purpose: it would be a second, unaudited way to change roles.

### Frontend: `web/src/app/platform/` (Angular 22)

- `/platform` lazy route tree. Its own shell (sidebar, topbar, mobile menu). Client-rendered only (`RenderMode.Client`). `noindex` by meta tag, the `X-Robots-Tag` header and robots.txt.
- Screens: `/platform/login`, `/forgot-password`, `/reset-password`, `/dashboard`, `/forbidden`, `/admin`, `/admin/users`, `/admin/verticals`, `/admin/roles`, `/admin/assignments`.
- `AuthService` (signals: `unknown | anonymous | authenticated`, `canGlobal / canAnywhere / canIn`), `authGuard`, `anonymousOnlyGuard`, `permissionGuard`, session-expiry interceptor (401 → sign-in with `returnUrl` and `reason=expired`).
- Styling: `platform.css`, loaded only by the platform route, `pf-` prefixed, tokens only. Two tokens added to `tokens.css`: `--danger`, `--danger-soft`.
- HttpClient, XSRF handling, `ApiService` and `AuthService` are provided **on the /platform route**, so the public bundle does not load them.

### Public site changes (kept minimal, verified)

- Public routes now nest under `PageShellComponent` (a parent route) instead of `App` rendering the shell for every URL. **URLs are unchanged.**
- Parity check against the pre-change build: the visible text of all 18 prerendered pages is identical. The element structure is identical except for one empty `<router-outlet>` inside `<app-root>`. The only inline-CSS change is the two new danger tokens. `sitemap.xml` and `robots.txt` were byte-identical before `/platform/` was added to robots.txt.
- `web/public/_redirects` (new): `/platform` and `/platform/*` → `/index.csr.html` (200 rewrite). `_headers`: noindex and `no-store` for `/platform`.

### Infrastructure prepared (nothing deployed)

- `backend/docker-compose.yml` (Postgres 17), `backend/Dockerfile` (gunicorn, prod settings), `backend/.env.example`.
- `web/proxy.conf.json`: `ng serve` forwards `/api` to `localhost:8000`.
- `functions/api/[[path]].js`: the Cloudflare Pages `/api/*` same-origin proxy. **Inert unless `API_ORIGIN` is set** (answers 503). Never forwards `/api/v1/internal/*`.
- `.github/workflows/ci.yml` (validation only) and `deploy-preview.yml` (manual; refuses `ECell`; needs secrets that do not exist).

---

## 2. Exact commands

### First-time setup
```bash
cd backend
python3.13 -m venv .venv            # or: uv venv --python 3.13 .venv
.venv/bin/pip install -r requirements/dev.txt
cp .env.example .env                # then edit if needed
docker compose up -d db             # Postgres on localhost:5432
set -a; source .env; set +a         # load env vars into this shell
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_rbac
```

### Create a user to sign in with (development only; refuses when DEBUG is off)
```bash
.venv/bin/python manage.py create_dev_user --email you@example.com --password 'a-long-dev-password' --name "You" --role SUPER_ADMIN
```
Or a whole demo organisation ("Demo Vertical A/B", `<role>@demo.local`, password `demo-password-123`):
```bash
.venv/bin/python manage.py seed_dev_demo
```

### Run
```bash
.venv/bin/python manage.py runserver 8000     # API: http://localhost:8000/api/v1/
npm run dev                                   # from the repo root: Angular at http://localhost:4200
```
Open http://localhost:4200/platform/. Password-reset emails print in the `runserver` terminal (console email backend). The API schema is at http://localhost:8000/api/v1/docs (dev only).

### Tests and checks (what CI runs)
```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test .venv/bin/pytest
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .
cd backend && .venv/bin/python manage.py makemigrations --check --dry-run
cd web && npm run lint && npm run test:ci && npm run build
node --test "tools/tests/*.test.mjs"          # from the repo root
```

### Migrations
```bash
.venv/bin/python manage.py makemigrations <app>   # after changing models
.venv/bin/python manage.py migrate
```
Each app has one `0001_initial.py`. Commit migrations with the model change; CI fails if they are missing.

---

## 3. Test results at completion

| Suite | Result |
|---|---|
| Backend `pytest` | **116 passed** |
| Frontend `ng test` (Vitest) | **19 passed** |
| `/api` proxy (`node --test`) | **5 passed** |
| `ruff check`, `ruff format --check`, `manage.py check`, `makemigrations --check` | clean |
| `ng build` | 18 routes prerendered, no warnings |

Backend coverage, by concern:
- **Escalation** (`apps/rbac/tests/test_escalation.py`, table-driven): non-governors refused on every governance mutation with a DENIED audit row; vertical head cannot grant any role in any scope, including to themselves; Admin Head cannot grant SUPER_ADMIN/ADMIN_HEAD/TECHNICAL_HEAD, or roles carrying permissions they lack; Admin Head cannot revoke or deactivate a Super Admin; no self-assignment or self-deactivation; last Super Admin → **409**; scoped lists hide other verticals; out-of-scope objects answer 404; revoked roles stop working immediately; deactivation ends live sessions.
- **Policy engine** (`test_policy.py`): each condition (role carries the permission, in force, current year, scope contains the target, active user, own-only); **self-approval → 403** and duplicate stage approver (guard for Phase 2); a scan that fails if application code compares role names.
- **Auth/CSRF** (`test_auth.py`): cookie flags; login without CSRF → 403; unsafe authenticated request without CSRF → 403; failed logins indistinguishable; login rate limit (6th → 429); forgot-password gives the same answer for known and unknown emails, and is rate limited; reset is single-use, expires, enforces password rules, ends every session, and the token never reaches the audit log; Argon2 is the production hasher.
- **Invariants** (`test_models.py`), **URL permission coverage** (`test_url_coverage.py`), **admin API happy paths** (`test_admin_api.py`), and a check that no organisational verticals or people are seeded.

### Browser verification (local, Chrome in the app's browser pane)
Verified against the running stack with the demo organisation:
- anonymous → login with `returnUrl`; sign-in returns there;
- vertical head: nav shows only permitted items; data scoped to their vertical; no create/revoke/deactivate actions;
- member: nav shows Dashboard and Verticals only; opening `/platform/admin/users` → `/platform/forbidden`;
- Super Admin: created a vertical, assigned a vertical head, archive refused while a head exists (409 message shown), revoked with reason, archive then succeeded; all actions in the audit log;
- server-side session deletion → next in-app navigation lands on sign-in with "session ended";
- 375 px (phone) and 1280 px layouts; tables collapse to stacked rows; no horizontal overflow;
- public pages unchanged (navbar/footer present; platform CSS not loaded; `robots` stays `index, follow`).

**Bugs found by that verification, and fixed:**
1. The CSRF header was never sent. Angular's cookie extractor is a root singleton and ignored the route-level cookie name. Fixed with a route-provided `CsrfTokenExtractor` (with tests).
2. `anonymousOnlyGuard` and `permissionGuard` called `inject()` after `await` and threw. Found by unit tests, fixed, re-verified in the browser.
3. The confirm dialog relied on the async `<dialog>` `close` event, which was not delivered in the embedded browser. It now emits synchronously from the confirm button. Its state became signals, so re-opening resets it.
4. The mobile menu button was squeezed to 42.5 px. Fixed to 44 px.

---

## 4. Known limitations (honest list)

- **Docker Compose was not run** in this environment (the Docker daemon was not available). Development and tests used a local PostgreSQL 15 on port 5433. The compose file is standard but unverified here. The first developer to run it should confirm.
- **CI has not run on GitHub yet.** Every CI step was run locally and passed. The workflow runs on the next push to `platform/**` or `main`. Action versions (`@v4`/`@v5`) and Node 24 are assumptions to confirm on first run.
- **Production append-only hardening is not done.** The DB role still technically has UPDATE/DELETE on `audit_auditlog`. `REVOKE UPDATE, DELETE ON audit_auditlog FROM <app_role>;` belongs in the first production deploy (needs N-1).
- **Rate limiting uses per-process memory in dev.** Production settings use the database cache (`createcachetable` on release) so limits are shared across gunicorn workers.
- **Forgot-password timing:** the known-email path sends mail synchronously, so it is measurably slower than the unknown-email path. The response body and status are identical. A timing-equalising queue can come with the cron tick (ADR-006).
- **Logout-everywhere** scans live sessions (fine at E-Cell scale).
- **Typed API models** are hand-written (`platform/core/api.types.ts`). Generating them from the OpenAPI schema (`openapi-typescript`) is deferred to avoid a dependency this phase.
- **Prettier** is enforced on platform code only. Existing public files were never formatted (50 files); reformatting them was out of scope.
- `ng test` needs spec files to exist. It now does (it failed before Phase 1 only because there were none).
- **Component style budget** raised from 4 kB to 8 kB (warning) because the whole platform layer is one component stylesheet.
- Tech Head's `audit.view` shows the whole log (the matrix intends "technical events"; filtering is deferred).
- Email verification is recorded (`email_verified_at`, set when a reset or invite link is used) but there is no separate verification flow yet.
- The second factor (PIN) from the Control Room is not ported yet (roadmap: Phase 1b follow-up). Password-only for now, local only.

## 5. Production-affecting caveat (read before merging)

If `platform/phase-1` is merged to `main` and someone runs the existing manual `npm run deploy`:
- `/platform/*` would be served (the login page renders);
- `functions/` would be uploaded, so `/api/*` would answer **503** (no `API_ORIGIN` in production);
- so the platform would be visible but unusable.

The public site itself is unaffected (verified parity). **Recommendation:** keep this branch unmerged, or merge but do not run the production deploy, until N-1 (hosting) is resolved and a backend exists.

## 6. Intentionally deferred (by the authorization, or to later phases)

Production deployment of anything · Neon/Render accounts · Supabase data migration · real verticals, heads or Super Admins (N-2, N-5) · custom role editor (roles are read-only via API) · approval rules and the content workflow (Phase 2) · EVENT/PROJECT-scoped assignments in the UI (the model supports them) · succession UI, audit UI, KB (Phase 4) · Redis/Celery (none added) · renaming the `ECell` label · GitHub organization move (N-6).

## 7. Prerequisites for Phase 2

1. Review and ratify **ADR-010** (Super Admin exemption from the grant-subset rule).
2. Review the permission-matrix addendum in `04_PERMISSION_MATRIX.md`.
3. Let CI run once on GitHub (push the branch) and fix anything environment-specific.
4. Decide whether to merge `platform/phase-1` before N-1 (see §5).
5. For the first *shared* environment: N-1 (hosting spend and account), N-6 (GitHub org), then a staging deploy using the Dockerfile + Neon + preview proxy.
6. N-3/N-4 before the approval workflow is switched on in Phase 2.
