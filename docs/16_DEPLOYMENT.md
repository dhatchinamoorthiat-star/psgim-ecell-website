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

`DJANGO_SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CLOUDINARY_URL`, `EMAIL_*`, `GITHUB_DISPATCH_TOKEN`, `TICK_SECRET`, `ORG_TIMEZONE=Asia/Kolkata`, `SENTRY_DSN` (optional, free tier).

## Rollback

- Frontend: Cloudflare dashboard → Pages → psgim-ecell → Deployments → pick previous → *Rollback*. Instant.
- Backend: redeploy previous image tag. DB: forward-fix migration; restore from backup only for data loss.
- Content: rollback a version in the CMS (doc 07), which republishes.

## Backups

Daily `pg_dump` via GitHub Actions schedule to a private storage bucket (Cloudflare R2 free tier — verify limits), 30-day retention. Quarterly restore drill recorded in the KB.

## Free-tier tracking

Keep a table in the KB: service, plan, limit, current usage, date checked, upgrade trigger. Paid tier justified only when a limit is hit twice in a month or cold starts break event-day check-in.
