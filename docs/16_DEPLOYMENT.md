# 16 — Deployment

## Current (verified 2026-09-25)

- Cloudflare Pages project **`psgim-ecell`**, `wrangler.toml` → `pages_build_output_dir = "web/dist/web/browser"`, `compatibility_date = "2026-09-22"`.
- **Production branch is `ECell`** (not `main`). `--branch main` publishes to a *preview* alias and still reports success.
- Deploy is manual from a laptop:

```bash
npm run deploy
```

  (= `npm --prefix web run build && npx wrangler pages deploy web/dist/web/browser --branch ECell --project-name psgim-ecell`)
- Preview: `npm run deploy:preview` → `preview.psgim-ecell.pages.dev`. Every deployment also gets `<hash>.psgim-ecell.pages.dev`.
- `web` build = `ng build` then `postbuild.mjs` (sitemap, robots, fallback `_headers`).
- Control Room: Vercel today; uncommitted OpenNext/Workers config in `ecell/wrangler.jsonc`.

## Phase 1 additions (prepared, not deployed)

- `web/public/_redirects` rewrites `/platform` and `/platform/*` to `/index.csr.html` (the platform is client-rendered); `_headers` marks them `noindex` + `no-store`.
- `functions/api/[[path]].js` (repo root, picked up by `wrangler pages deploy` run from the root) proxies `/api/*` to `API_ORIGIN`. **Unset = inert (503).** It forwards only canonical paths under an **allowlist of API resources** (`ALLOWED_RESOURCES`); every new top-level API resource (Phase 2+) must be added there, or it will answer 404 through the proxy. Phase 2 added `content` (CMS public read API), `public` (the membership-interest form) and `join` (the staff inbox). `/api/v1/internal/*` is never forwarded in any encoding. Set `API_ORIGIN` only for the Pages preview environment until N-1. Pair with backend `CSRF_TRUSTED_ORIGINS=<site origin>` and `CLIENT_IP_HEADER=CF-Connecting-IP`. Also set `PROXY_SHARED_SECRET` to the same random value on **both** the Pages Function environment and the Django backend — the function attaches it to every forwarded request, and Django trusts `CLIENT_IP_HEADER` only when it matches (review finding F4); until both are set, the backend safely falls back to its own `REMOTE_ADDR` instead of trusting a spoofable header.
- Backend release steps (when a host exists): `python manage.py migrate && python manage.py createcachetable && python manage.py seed_rbac`. `audit_auditlog` already rejects ordinary UPDATE/DELETE/TRUNCATE at the database level via triggers shipped in the `audit.0002_append_only_trigger` migration (no manual step needed) — but not against the owning DB role's own DDL (`ALTER TABLE ... DISABLE TRIGGER`), since this project has one DATABASE_URL role that owns every table it migrates; see `docs/09_AUDIT_LOG_SPECIFICATION.md` for the precise guarantee. Optionally also run `backend/scripts/harden_audit_log.sql` against any DB role that is *not* the table owner, as defense in depth (see `PHASE_1_IMPLEMENTATION_NOTES.md` §10, F8).
- CI: `.github/workflows/ci.yml` validates only. `deploy-preview.yml` is manual, refuses `ECell`, needs `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.
- ⚠ Merging `platform/phase-1` and running the manual production deploy would publish a non-functional `/platform` (API 503). See `PHASE_1_IMPLEMENTATION_NOTES.md` §5.

## Target environments

| Env | Frontend | Backend | DB |
|---|---|---|---|
| local | `ng serve` :4200 with dev proxy `/api → localhost:8000` | `manage.py runserver` | Docker Postgres |
| preview | Pages preview alias per branch | staging backend | staging DB (separate Supabase/Neon project) |
| production | Pages `ECell` branch | prod backend | prod DB |

## Target pipeline

GitHub Actions on push to `main`: lint → test (web + backend) → build → `wrangler pages deploy --branch ECell`. PR branches deploy to preview aliases. Secrets in GitHub Actions: `CLOUDFLARE_API_TOKEN` (Pages:Edit only), `CLOUDFLARE_ACCOUNT_ID`. Content publishes trigger the same workflow via GitHub `repository_dispatch` (backend secret `GITHUB_DISPATCH_TOKEN`, fine-grained, this repo only). See ADR-009.

Backend: Docker image built in CI, deployed to Render (ADR-008; fallback Cloud Run) with Neon Postgres; `manage.py migrate` runs as a release step, **before** the new code serves traffic. Migrations must be backwards compatible for one release (expand → contract).

## Environment variables (backend — see `backend/.env.example` when created)

`DJANGO_SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CLIENT_IP_HEADER`, `PROXY_SHARED_SECRET` (must match the value set on the Pages Function; see above), `CLOUDINARY_URL`, `EMAIL_*`, `JOIN_NOTIFY_EMAIL` (optional — recipient for new membership-interest notifications; **no default**, and unset simply skips the notification while the submission is still stored), `GITHUB_DISPATCH_TOKEN`, `TICK_SECRET`, `ORG_TIMEZONE=Asia/Kolkata`, `SENTRY_DSN` (optional, free tier).

The proxy contract itself is recorded in **ADR-004**.

## Rollback

- Frontend: Cloudflare dashboard → Pages → psgim-ecell → Deployments → pick previous → *Rollback*. Instant.
- Backend: redeploy previous image tag. DB: forward-fix migration; restore from backup only for data loss.
- Content: rollback a version in the CMS (doc 07), which republishes.

## Backups

Daily `pg_dump` via GitHub Actions schedule to a private storage bucket (Cloudflare R2 free tier — verify limits), 30-day retention. Quarterly restore drill recorded in the KB.

## Free-tier tracking

Keep a table in the KB: service, plan, limit, current usage, date checked, upgrade trigger. Paid tier justified only when a limit is hit twice in a month or cold starts break event-day check-in.
