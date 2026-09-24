# ADR-009 — Cloudflare Deployment and the `ECell` Branch

- **Status:** ACCEPTED (documents current state and target pipeline; no configuration changed)
- **Date:** 2026-09-25

## What actually exists (verified)

| Fact | Evidence |
|---|---|
| Cloudflare Pages project `psgim-ecell` | `wrangler.toml` `name`; `.wrangler/cache/pages.json` |
| It is a **Direct Upload** project (built on a laptop, uploaded with `wrangler pages deploy`) | root `package.json` `deploy` script; no Pages Git integration config; no `.github/` workflows |
| Production branch is named **`ECell`** | `wrangler.toml` comment; `deploy` script uses `--branch ECell` |
| **`ECell` is not a Git branch.** Local and remote have only `main` and `origin/test` | `git branch -a` |
| Source of truth branch is `main` | Git history |
| No CI. Production can be deployed from **uncommitted** code | `/blogs/` was live on production before it was committed (fixed in commit `2e91ae7`) |
| Website repo is on a personal account: `github.com/dhatchinamoorthiat-star/psgim-ecell-website` | `git remote -v` |

## What `ECell` means

In a Direct Upload project, `--branch` is only a **label** attached to an uploaded
build. Cloudflare publishes the deployment labelled with the configured production
branch name (`ECell`) to `psgim-ecell.pages.dev`. Any other label becomes a
preview alias `<label>.psgim-ecell.pages.dev`. So:

- `npm run deploy` means build the **current working tree**, upload it, and label it `ECell`, which makes it live in production.
- `--branch main` means a preview at `main.psgim-ecell.pages.dev`. Production is unchanged, yet the command reports success.

The name `ECell` has nothing to do with Git. That is why it's confusing, and why
production drifted from the repository.

## Decision

### Target pipeline (Phase 1b onward; not implemented yet)

```
feature branch ──PR──► main
                         │  GitHub Actions: install → lint → test → build
                         ▼
             wrangler pages deploy web/dist/web/browser
                 --project-name psgim-ecell --branch ECell     (production)

PR branches ──► same pipeline with --branch <pr-branch>         (preview alias)
```

- **Only CI deploys production.** A laptop `npm run deploy` stays available as a documented break-glass step only.
- The production label **stays `ECell`** for now. Renaming it is a Cloudflare dashboard change that would briefly create the same confusion again. It is not worth the risk before CI exists. Revisit it in Phase 5 if moving to Git integration.
- Stay on **Pages** (ADR-003). Pages supports the one Function we need (the `/api/*` proxy, ADR-004).
- The CMS publish deploy hook (ADR-002) needs **either** Pages Git integration (which has native deploy hooks) **or** a GitHub Actions `repository_dispatch` triggered by the backend. Chosen approach: **`repository_dispatch` to the same CI workflow**. It keeps Direct Upload, keeps one pipeline, and needs only a fine-grained GitHub token stored as a backend secret.

### Guardrails to add with the CI (Phase 1b)
1. The deploy job fails if `git status --porcelain` is non-empty, so nothing uncommitted can be deployed.
2. The deploy job prints the deployed commit SHA into the Pages deployment message (`--commit-hash`, `--commit-message`).
3. `CLOUDFLARE_API_TOKEN` is scoped to *Pages: Edit* on this account only and stored in GitHub Actions secrets. It is never on a laptop.

## Not changed by this ADR
The Pages production branch, project settings, `wrangler.toml` and the Git branches are all
untouched. The root `package.json` deploy scripts are unchanged.

## Open item (non-blocking)
Move both repositories (`psgim-ecell-website`, `E-Cell`) into an E-Cell GitHub
organization, and add a second Cloudflare account admin. See `PHASE_1_AUTHORIZATION.md`.
