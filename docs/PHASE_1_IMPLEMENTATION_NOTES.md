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
| `rbac` | `Permission`, `Role`, `RolePermission(own_only)`, `RoleAssignment(scope_type, scope_id, academic_year, starts/ends, revoked)`, `catalogue.py`, `policy.py` (the engine), `services.py` (anti-escalation rules R1–R7, governance lock), `api.py` (per-method permission declarations), `approvals.py` (self-approval guard for Phase 2), `seed_rbac` |

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
- `functions/api/[[path]].js`: the Cloudflare Pages `/api/*` same-origin proxy. **Inert unless `API_ORIGIN` is set** (answers 503). Forwards only canonical, allowlisted `/api/v1/` resources; never `/api/v1/internal/*` in any encoding (see §8).
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

(Updated after the review remediation and governance decisions — see §8–§9. Original Phase 1 counts were 116 / 19 / 5; after remediation 170 / 22 / 34.)

| Suite | Result |
|---|---|
| Backend `pytest` | **184 passed** |
| Frontend `ng test` (Vitest) | **22 passed** |
| `/api` proxy (`node --test`) | **34 passed** |
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

---

## 8. Review remediation (2026-09-25)

An independent review of the branch found two blocking defects, an ineffective security
test, probe-only behaviours, and documentation drift. This pass fixed exactly those.

### F1 — governance could lapse (fixed)
- **R7** (`rbac/services.py` `_check_privileged_shape`): roles with `is_privileged`
  (SUPER_ADMIN, ADMIN_HEAD, TECHNICAL_HEAD) are assigned only GLOBAL, with no academic year and no
  end date → otherwise **400**. The check runs after authorisation, so unauthorised actors still get
  403 and learn nothing about the rule.
- `POST /academic-years/{id}/make-current` takes the governance lock, flips the year, and
  refuses with **409** (rolled back, no audit row) if that would leave no active Super Admin.
  An organisation with no governor before the switch is not made worse by it, so that case is
  allowed.
- Enforcement: APPLICATION (a CHECK constraint cannot reach `rbac_role.is_privileged`).
- The open question about `PLATFORM_ADMIN` / `FACULTY_ADVISOR` classification was decided on
  2026-09-25 — see §9.

### F6 — deactivation race (fixed)
- `lock_governance()` locks all live GLOBAL assignments in primary-key order. Revoke,
  deactivate and make-current all take it inside their transaction and re-check R3 after it,
  so concurrent operations serialise and the later one sees the earlier commit.
- `test_concurrent_deactivation_never_removes_all_governors` runs two real concurrent requests
  (transactional DB, threads, a widened race window). Verified: it **fails** with the lock removed
  and passes with it. The loser is refused with 409, or 400 "session interrupted" when the
  winner's deactivation has already ended the loser's session.

### F2 — proxy internal-path bypass (fixed)
- The proxy decodes the path once (as Django does), **rejects** rather than rewrites anything
  non-canonical (empty/dot segments, characters outside `[A-Za-z0-9._~-]`, so no encoded
  slashes, backslashes, leftover `%` or double encoding), then allowlists known `/api/v1/`
  resources (case-insensitive), never `internal`. It forwards the original path, so what was
  checked is exactly what Django routes, and it asserts the upstream origin equals `API_ORIGIN`.
  It also strips `Server` / `X-Powered-By` from responses.
- 34 proxy tests, covering every bypass form from the review, traversal, query-string, SSRF
  and legitimate paths. The previous proxy fails 22 of them.

### Tests
- **Session fixation rewritten:** a planted pre-login session key must change on login, the old key
  must be deleted and not authenticate, and the new one must work. Verified: it **fails** when
  session key rotation is disabled.
- **Promoted from review probes:** expired reset token; old password rejected after reset;
  unauthenticated sweep over every protected endpoint/method (generated from the URL conf, so
  new endpoints are covered automatically); cross-scope membership-end (404); vertical-head
  user PATCH in and out of scope (403); audit-write failure rolls the mutation back (500, no
  change, no row); refused mutation leaves no SUCCESS row; Angular session-expiry interceptor
  (401 → expire and redirect with returnUrl; auth endpoints and 403 ignored).
- The admin-head assignment test now asserts **201** for each assignment. The duplicate case has
  its own test asserting **409**.
- Cross-scope user PATCH: no seeded role holds vertical-scoped `user.manage`, so the cross-scope
  case is refused at the coarse gate (403). The test documents both in-scope and out-of-scope attempts.

### Documentation reconciled
`03_RBAC_MODEL.md` (seven system roles, `own_only`, `PermissionedAPIView`/`DeclaredPermission`,
R1–R7 including ADR-010, seeding via `seed_rbac`, `revoked_at`, custom roles not implemented);
`04_PERMISSION_MATRIX.md` (FACULTY_ADVISOR table, Vertical Head `kb.view` effectively
vertical-scoped, R7 note); ADR-010 (residual governance risk, unratified); API contract (400/409
additions); deployment (proxy allowlist maintenance).

### Follow-ups deliberately NOT done in this pass (from the review)
| ID | Item | When |
|---|---|---|
| F3 | Per-IP login throttle (current limit is per IP+email only) | before first deployment |
| F4 | Trust `CF-Connecting-IP` only with a proxy shared secret (backend is directly reachable) | before first deployment |
| F5 | Forgot-password timing (email sent synchronously) | before production email |
| F7 | Log refused GETs on governance endpoints | Phase 2 |
| F8 | Database-level append-only for `audit_auditlog` (REVOKE UPDATE/DELETE); users must never be deleted | first deployment |
| F9 | Session lifetime: decision record promises 7-day absolute / shorter admin sessions / rotation on privilege change; code has 12 h sliding only | **outstanding** architecture/documentation decision (not amended, not implemented) |
| F10 | Undeclared HTTP methods return 403 instead of 405 | Phase 2 |
| F11 | Platform skip link invisible on focus | Phase 2 |
| F12 | Platform ignores the saved theme preference | Phase 2 |
| F13 | Preview-deploy label: allowlist `^[a-z0-9-]+$` and refuse any case/space variant of `ecell` | before the preview workflow is first used |

This table records the review pass as it stood on 2026-09-25. **F3, F4, F5, F8 and F13 were
remediated on 2026-09-27 — see §10.** F7, F9–F12 are unchanged and remain as listed.

---

## 9. Governance decisions (ratified 2026-09-25)

1. **ADR-010: Option A.** Residual account/person identity risk accepted. The Super Admin
   appointment exemption and R1–R7 are unchanged. No R8, no separation field, no migration for
   separation of duties. The organisational requirements are at least two Super Admins (N-5,
   unresolved) and periodic review of privileged assignments. Recorded in ADR-010.
2. **PLATFORM_ADMIN: non-privileged.** A technical support/custodial role. `is_privileged=False`;
   R7 and R7a do not apply; scope, academic-year and end-date behaviour unchanged; permissions
   unchanged.
3. **FACULTY_ADVISOR: non-privileged, organisation-wide.** `is_privileged=False` (R7 does not
   apply). New `Role.global_only` flag (migration `rbac.0002_role_global_only`, additive,
   default False), set for FACULTY_ADVISOR only, enforced by **R7a**: a non-GLOBAL assignment is
   refused with 400. Academic-year and end-date limits remain allowed. Faculty approval authority,
   not governance authority. Appointment still governed by N-4.

Tests added (all in `apps/rbac/tests/test_governance_invariant.py`): Faculty Advisor
vertical/event/project → 400; global, global + year, global + end date, global + both → 201;
Platform Admin vertical, year-bound and end-dated → 201; unauthorised callers → 403 (never the
R7a 400); duplicate → 409; catalogue pinned to its pre-change hashes (permissions unchanged);
seeded flags. A mutation check (R7a disabled) makes the vertical test fail. For EVENT/PROJECT
scopes the 400 currently comes from the earlier "scope not available yet" check. R7a would
refuse them too once those scopes are enabled.

Migration validated on the existing development database (reversed and re-applied; role
permissions, permissions, assignments and users byte-identical; only FACULTY_ADVISOR flagged after
`seed_rbac`) and on a fresh database migrated from zero.

**Still outstanding (at the time of §9):** F9 (separate decision), the F3–F13 items in §8, N-1–N-9.
F3, F4, F5, F8 and F13 were remediated afterwards — see §10.

---

## 10. Engineering gate remediation (2026-09-27)

Closes five of the deployment blockers recorded in §8: F3, F4, F5, F8, F13. F9 and N-1–N-9 are
unchanged and remain outstanding; this pass did not touch them, `ecell/`, or any deployment
configuration.

### F3 — per-IP login throttle

- **Problem:** `LoginThrottle` bucketed by `(IP, email)`, so one IP could spray unlimited distinct
  email addresses without ever tripping a limit.
- **Solution:** `LoginIpThrottle` (`apps/accounts/throttles.py`), an IP-only DRF `SimpleRateThrottle`
  scope `login_ip`, added alongside the existing `LoginThrottle` on `LoginView.throttle_classes`.
  Both must pass for a login attempt to be admitted.
- **Rate:** `20/min` per IP (`DEFAULT_THROTTLE_RATES["login_ip"]`, `config/settings/base.py`).
  Rationale: `LoginThrottle` already limits genuine password guessing to 5/min per account, so
  20/min per IP still admits four full accounts' worth of attempts a minute from one address —
  enough that a shared network (a hostel or lab NAT with several students signing in around the
  same time) is not blocked by normal use, while capping how many distinct accounts one IP can
  probe per minute.
- **Tests:** `apps/accounts/tests/test_login_ip_throttle.py` — below/at/over the IP limit, distinct
  emails from one IP sharing the bucket, independent buckets per IP, the pre-existing (IP, email)
  throttle still enforced, and correct success/failure behaviour once the IP bucket is exhausted.
- **Deployment step:** none; the rate ships as a Django setting.
- **Residual risk:** none identified. A sufficiently large botnet spread across many IPs is out of
  scope for an application-layer throttle (this was true before, too); Cloudflare-level protection
  is a Phase 2+ concern.

### F4 — proxy-to-backend client-IP trust

- **Problem:** `client_ip()` trusted `CLIENT_IP_HEADER` (`CF-Connecting-IP`) whenever it was
  configured, with no check that the request had actually gone through the Cloudflare proxy. Render
  gives the backend a public URL, so a request could reach Django directly and set that header to
  anything.
- **Solution:** a shared secret, `PROXY_SHARED_SECRET` (`config/settings/base.py`, env var, never
  hardcoded). `functions/api/[[path]].js` strips any client-supplied
  `X-Ecell-Proxy-Secret` header and attaches its own from `env.PROXY_SHARED_SECRET` (a Cloudflare
  Pages environment variable — never sent to the browser) to every forwarded request.
  `apps/core/net.py::client_ip()` trusts `CLIENT_IP_HEADER` only when that header is present and
  matches `PROXY_SHARED_SECRET` via `hmac.compare_digest` (constant-time). No secret configured, no
  header, or a mismatch all fall back to `REMOTE_ADDR` — the trust decision fails closed, not open.
- **Trust boundary:** the Pages Function is the only party that can set a proxy secret Django will
  accept; the backend never trusts a client-IP header on a request it cannot verify came through
  that function. No CORS or JWT was introduced — sessions/CSRF are unchanged (ADR-005).
- **Tests:** `tools/tests/api-proxy.test.mjs` (secret attached when configured, absent when not,
  client-supplied copy stripped and replaced) and `apps/core/tests/test_net.py` (valid secret +
  client IP → trusted; missing/invalid secret + spoofed IP → not trusted, falls back to
  `REMOTE_ADDR`; valid secret without a client-IP header → safe fallback; `CLIENT_IP_HEADER` unset →
  unchanged prior behaviour; `CLIENT_IP_HEADER` set without a secret → fails closed).
- **Deployment step:** set `PROXY_SHARED_SECRET` to the same random value in both the Cloudflare
  Pages Function environment and the Django backend environment. Until both are set, `client_ip()`
  falls back to `REMOTE_ADDR` (safe, but records the Render load balancer's address rather than the
  real client — no worse than today, not yet the fix).
- **Residual risk:** none identified, given the secret is generated randomly and kept out of
  version control (`.env.example` documents the variable name only, not a value).

### F5 — forgot-password timing leakage

- **Problem:** `PasswordForgotView` called `send_password_reset()` (synchronous SMTP) only when the
  account existed, so response latency could reveal account existence even though the response body
  was identical.
- **First solution (2026-09-27, superseded below):** dispatched the send on one uncapped
  `threading.Thread` per request. A follow-up security review correctly found this created a new
  problem: no worker limit, no SMTP timeout, so a slow/unresponsive mail server could leave threads
  blocked indefinitely and sustained requests could exhaust process resources.
- **Bounded solution (current):** `apps/accounts/emails.py` now dispatches through a small,
  module-level `concurrent.futures.ThreadPoolExecutor` singleton (`MAX_WORKERS = 4`, created once at
  import — not per request) instead of a raw thread per request:
  - **Worker bound:** at most 4 sends run concurrently. Chosen because Phase 1 runs one small Render
    dyno, not a mail farm; 4 is enough to absorb a burst without meaningfully competing with request
    handling for CPU/memory.
  - **SMTP timeout:** `EMAIL_TIMEOUT` (new setting, `config/settings/base.py`, default 10s, plumbed
    into the SMTP backend's `timeout` kwarg via `MAILERS.default.OPTIONS`) bounds how long a single
    send can occupy a worker, so a stuck mail server cannot permanently consume one — the queue
    behind it. 10s is generous for a few-KB reset email over a working connection.
  - **Backlog bound:** `MAX_QUEUED = 50`. `ThreadPoolExecutor`'s own work queue has no size limit,
    which would just move the "unbounded" problem from threads to queued callables. Once 50 sends are
    already pending, `send_password_reset_async()` drops the send (logged at ERROR) instead of
    queuing indefinitely or blocking the request.
  - **Failure visibility:** the target function catches every exception and logs it via
    `logging.getLogger("apps.accounts.emails").exception(...)`, so an SMTP failure is no longer
    silently swallowed by Python's default `threading.excepthook` — it appears in the application's
    own logs.
  - **Graceful shutdown:** unchanged from Python's own behavior — `ThreadPoolExecutor` registers an
    `atexit` hook that waits for already-submitted work at normal interpreter shutdown; no extra code
    needed for Phase 1's process model.
  - `join_pending()` (test-only) now waits on `Future`s from the executor instead of joining raw
    threads.
- **Tests:** `apps/accounts/tests/test_auth.py` — `test_forgot_password_response_does_not_block_on_email_delivery`
  proves the response returns while a send is still in flight, via a `threading.Event`, not a
  sleep-based timing assertion; `test_forgot_password_worker_pool_is_bounded_and_created_once` asserts
  the executor is a singleton with a fixed worker count; `test_smtp_timeout_is_configured` asserts
  `EMAIL_TIMEOUT` is wired into the SMTP backend options; `test_smtp_failure_is_logged_not_silently_dropped`
  asserts a raised exception in the send is captured by `caplog` at ERROR level and the response is
  still 202; `test_forgot_password_backlog_is_bounded` pins `MAX_QUEUED` low and proves the Nth send
  beyond the cap is dropped (identical response either way) rather than queued forever; the existing
  existing/non-existing-account, identical-response-body, no-background-work-for-unknown-account,
  rate-limiting and token/reset tests are all still covered.
- **Deployment step:** none required; optionally tune `EMAIL_TIMEOUT` per the production SMTP
  provider's expected latency.
- **Residual risks (documented, not eliminated — no durable queue exists in Phase 1 by design):**
  1. The existing-account path still does one extra synchronous DB write (the
     `auth.password_reset_requested` audit row) that the non-existing path does not — a sub-millisecond,
     fixed-cost signal, orders of magnitude smaller than the SMTP round trip it replaces.
  2. **In-process dispatch has no persistence.** A worker process restart (deploy, crash, OOM) loses
     any send that had not yet completed, with no retry. A user who does not receive a reset email can
     simply request another one; this is judged acceptable for Phase 1 given the explicit
     no-Redis/Celery constraint, but it is a real limitation of an in-process executor, not a solved
     problem — a durable queue would remove it if the constraint is ever revisited.
  3. Under sustained load beyond `MAX_QUEUED`, sends are dropped rather than delayed — a deliberate
     choice (bounded resource use over guaranteed delivery) that should be revisited if reset-email
     volume ever approaches that scale.

### F8 — audit log database integrity

- **Problem:** `AuditLog` was append-only only at the application layer (`AppendOnlyError`);
  nothing stopped a raw SQL client, a maintenance script, or any other path that bypasses the ORM
  from updating or deleting rows. `docs/09_AUDIT_LOG_SPECIFICATION.md` claimed a migration already
  revoked UPDATE/DELETE from the application DB role — no such migration existed, and it would not
  have worked anyway (see below).
- **First solution (2026-09-27, corrected below):** migration
  `apps/audit/migrations/0002_append_only_trigger.py` added `BEFORE UPDATE`/`BEFORE DELETE` triggers.
  A follow-up security review found two gaps and one overstated claim:
  1. **`TRUNCATE audit_auditlog` was not blocked at all** — PostgreSQL never fires row-level
     `BEFORE UPDATE`/`BEFORE DELETE` triggers for `TRUNCATE`, and this was verified by actually running
     it: the table was wiped in one statement.
  2. **The owning role can disable or drop the trigger with ordinary DDL** — verified by running
     `ALTER TABLE audit_auditlog DISABLE TRIGGER audit_auditlog_no_delete;` as the same role the
     application uses, then deleting a row successfully. PostgreSQL ties this ability to table
     ownership, not to a revocable privilege, and this project's single `DATABASE_URL` role owns the
     table it migrates.
  3. The original migration docstring and this document both said the protection was "identical...
     regardless of ownership" — true against ordinary DML, **not** true against DDL from the owning
     role. That wording has been corrected below and in the migration itself.
- **Corrected solution:**
  - Added a third, **statement-level** trigger (`FOR EACH STATEMENT`, since `BEFORE TRUNCATE` cannot
    be row-level) — `audit_auditlog_no_truncate` — reusing the same function, in the same migration
    (edited in place; it had not been applied anywhere outside local development).
  - **What is now guaranteed, precisely:** any *ordinary* UPDATE, DELETE, or TRUNCATE statement is
    rejected by PostgreSQL itself, for every role including the table owner, identically in local
    dev, CI and production. Verified directly against PostgreSQL with raw SQL (bypassing Django and
    the ORM entirely) for all three statement types.
  - **What is explicitly NOT guaranteed:** protection against the owning database role issuing
    privileged DDL (`ALTER TABLE ... DISABLE/ENABLE TRIGGER`, `DROP TRIGGER`, `DROP FUNCTION`). Since
    this architecture has one DATABASE_URL role that both migrates and serves the application, that
    role can always do this — no trigger or migration can prevent an owner from altering its own
    table. Closing that specific gap would require a second, non-owning database role (the migrating
    role granting privileges to a separate, restricted runtime role), which does not exist in this
    project and is a deployment/architecture decision, not something addressed here.
  - `backend/scripts/harden_audit_log.sql` updated to also `REVOKE ... TRUNCATE` (previously only
    UPDATE/DELETE) and to state the ownership limitation explicitly rather than implying the trigger
    alone is tamper-proof.
- **User deletion:** confirmed there is no delete endpoint anywhere in `apps.accounts` — only
  `UserDeactivateView`/`UserReactivateView`. This is recorded as an explicit invariant in
  `apps/accounts/tests/test_no_user_deletion.py` rather than left implicit, since deleting a user
  row would either cascade into audit history or require weakening `AuditLog.actor`'s `SET_NULL`.
  No deletion feature was added.
- **Tests:** `apps/core/tests/test_models.py` — INSERT succeeds; UPDATE, DELETE and now TRUNCATE via
  raw SQL (bypassing the ORM entirely, each in its own savepoint) are rejected by the database
  trigger, not just `AppendOnlyError`; a new `test_owning_role_can_disable_the_trigger_via_ddl` proves
  — and pins as an accepted, documented limitation rather than an untested assumption — that the
  owning role *can* disable the trigger and then delete a row, so this claim cannot silently drift
  out of date; an audit row survives the only lifecycle event that touches its subject (user
  deactivation) unchanged. `apps/accounts/tests/test_no_user_deletion.py` unchanged from the first
  pass.
- **Deployment step:** none required for the DML/TRUNCATE guarantee (ships in the migration).
  Optionally run `backend/scripts/harden_audit_log.sql` against any non-owner DB role once one exists
  (it has no effect on the owning role, by design of PostgreSQL ownership, not a bug in the script).
- **Residual risk (accurately stated, not eliminated):** the application's own database role can
  disable or drop the append-only triggers using its own credentials via DDL. This is a real,
  verified limitation, not a hypothetical one, and matches the trust boundary already implied by
  N-1/N-6 (whoever holds the application's database credentials already controls the data) — it is
  not a new exposure introduced by this fix, but the fix's guarantee should not be described as
  stronger than it is.

**Follow-up (2026-09-27, same day): test-infrastructure conflict.** Adding the TRUNCATE trigger
broke `apps/rbac/tests/test_governance_invariant.py::test_concurrent_deactivation_never_removes_all_governors`,
which needs `@pytest.mark.django_db(transaction=True)` for genuine cross-connection concurrency.
Django's `TransactionTestCase` teardown flushes every table with one combined
`TRUNCATE ... CASCADE`, and — confirmed by direct investigation, not assumption —
`audit_auditlog.actor` referencing `accounts_user` means CASCADE always tries to reach
`audit_auditlog` through that foreign key whenever `accounts_user` is flushed, *regardless* of
Django's `available_apps` scoping (tried and rejected: excluding `apps.accounts` from
`available_apps` breaks `get_user_model()` on every authenticated request, since `apps.accounts`
must stay registered for the whole test). Since a user who has been an audit actor cannot be
deleted or have its audit rows removed through any path (ORM, raw SQL, or DDL-free means — this
is intentional, see the residual risk above and `apps/accounts/tests/test_no_user_deletion.py`),
no combined flush that includes both tables can ever succeed once F8 exists — a permanent,
structural fact about this schema, not a quirk of one test. The fix, entirely inside the test file
(no application code, migration, or trigger touched): a module-level patch to Django's own
`BaseDatabaseIntrospection.django_table_names`, applied once at import time, excluding exactly
`audit_auditlog` and `accounts_user` from what any `flush`/`TransactionTestCase` teardown ever
considers for the rest of the session. The test's own logic (thread barrier, timing, assertions)
is unchanged; only its decorator reverted to plain `transaction=True` and its docstring grew.
Verified clean over 15 isolated runs and 3 full-suite runs (213/213, zero teardown errors). The
test's own pre-existing, independent `SessionInterrupted` timing race (present before F8, confirmed
by stashing all F3–F13 changes and reproducing it on bare `main`) is untouched and remains
intermittent — it did not reproduce in any of these verification runs, which does not mean it is
fixed, only that it did not trigger this time; it was not investigated or fixed here.

### F13 — preview deployment label guard

- **Problem:** `deploy-preview.yml` refused only the exact, case-insensitive string `ECell`; every
  other case/format variant, or a label with whitespace/punctuation, passed through unchecked.
- **Solution:** `tools/validate-preview-label.mjs` (`isValidPreviewLabel`), enforcing
  `^[a-z0-9-]+$` and rejecting any label whose hyphens-removed, lower-cased form equals `ecell`
  (catches `ECell`, `ecell`, `ECELL`, `e-cell`, etc., while still allowing `ecell-preview` or
  `not-ecell` as distinct labels). `deploy-preview.yml` now checks out the repo and runs
  `node tools/validate-preview-label.mjs "$LABEL"` before installing dependencies or building,
  replacing the old inline exact-match check.
- **Tests:** `tools/tests/preview-label.test.mjs` — representative accepted labels
  (`preview`, `platform-preview`, `feature-123`, …) and rejected ones (every case/hyphenation of
  `ECell`, whitespace, punctuation, non-ASCII, empty/non-string input).
- **Deployment step:** none; the workflow change is already in the repo. No production deployment
  workflow was created — this remains a manual, `workflow_dispatch`-only preview workflow.
- **Residual risk:** none identified for this workflow. Production deployment is still gated on
  N-1/N-6, unchanged.

### Verification run for this pass (2026-09-27, F3/F4/F5/F8/F13)

- Backend: `pytest` — 207 passed (184 from the merged checkpoint + 23 new, table above).
- Frontend: `ng test --watch=false` — 22 passed, unchanged.
- Proxy: `node --test "tools/tests/*.test.mjs"` — 66 passed (34 from the checkpoint + 32 new: 3 for
  F4's secret-header behaviour, 29 accepted/rejected preview-label cases for F13).
- `ruff check .` / `ruff format --check .`: clean.
- `manage.py check`: no issues.
- `manage.py makemigrations --check --dry-run`: no changes detected.
- Migrations verified on a freshly created database (`migrate` from zero) and by rolling
  `audit.0002_append_only_trigger` back to `0001` and reapplying it, confirming the triggers are
  present afterwards.

### Verification run for the F5/F8 security-review fix (2026-09-27, same day)

A follow-up security review of the pass above found two issues, fixed in this second round (see the
corrected F5 and F8 write-ups above): the F5 background-send thread pool was unbounded with no SMTP
timeout, and the F8 trigger did not cover `TRUNCATE` and its docstring overstated its immunity to
owner-level DDL.

- Backend: `pytest` — 213 passed. (207 from the prior pass + 6 new: 4 F5 tests — bounded worker pool,
  SMTP timeout configured, SMTP failure logged, backlog bounded — and 2 F8 tests — TRUNCATE rejected,
  owning-role DDL limitation pinned.) One pre-existing, unrelated failure,
  `apps/rbac/tests/test_governance_invariant.py::test_concurrent_deactivation_never_removes_all_governors`
  (a `SessionInterrupted` race in a concurrency test, nothing to do with F3/F4/F5/F8/F13), reproduces
  identically on the untouched pre-fix code and is out of scope for this pass — not investigated or
  fixed here.
- Frontend: `ng test --watch=false` — 22 passed, unchanged.
- Proxy: `node --test "tools/tests/*.test.mjs"` — 66 passed, unchanged (F3/F4/F13 were not touched in
  this round).
- `ruff check .` / `ruff format --check .`: clean.
- `manage.py check`: no issues. `manage.py makemigrations --check --dry-run`: no changes detected.
- Migration re-verified on a fresh database (`migrate` from zero), and by rolling
  `audit.0002_append_only_trigger` back to `0001` and reapplying it — all three triggers
  (`audit_auditlog_no_update`, `audit_auditlog_no_delete`, `audit_auditlog_no_truncate`) present
  afterwards, no orphaned function/triggers after rollback.
- Raw PostgreSQL verification (bypassing Django and the test suite), against the same `ecell` role
  the application uses: `INSERT` succeeds; `UPDATE`, `DELETE` and `TRUNCATE` all rejected with
  `audit_auditlog is append-only: ... is not permitted`; the row survives all three. Separately
  confirmed `ALTER TABLE audit_auditlog DISABLE TRIGGER audit_auditlog_no_delete;` followed by a
  plain `DELETE` succeeds as the owning role — the documented DDL limitation is real, not
  hypothetical.
