# 28 — Phase A2 Deployment and Rollback Runbook

- **Status:** PREPARED. **Not executed.** Nothing in this document has been run against any hosted service.
- **Date:** 2026-10-11
- **Scope:** first production deployment of the Django API (Render + Neon) behind the existing Cloudflare Pages site and `/api` proxy.
- **Inputs:** ADR-004 (same-origin proxy), ADR-008 (hosting), ADR-009 (Cloudflare), `26_EVENT_ATTENDANCE_AUDIT.md`, `27_PHASE_2_EVENT_OPERATIONS_ROADMAP.md`.

**Rules.**
- Never paste a secret into chat, a ticket, a commit or this document.
- Variable *names* appear here; their *values* live only in the hosting dashboards.
- Every step names who performs it.

Steps marked **(verify)** depend on a vendor behaviour that was not confirmed from this repository. Confirm each one on the vendor's current documentation or on staging before relying on it.

---

## 0. Deployment blockers

Deployment must not start while any of these is open.

| # | Blocker | Owner | Needed for |
|---|---|---|---|
| B1 | **Billing and account ownership.** Approval of Render Starter (about $7/month) and Neon Free; which E-Cell-owned email owns Render, Neon, Brevo and Cloudflare; whose payment method; a second admin on each. | Super Admin / faculty coordinator | §3 onward |
| B2 | **The two initial Super Admins** (N-5): full names and email addresses. | E-Cell leadership | §6 |
| B3 | **Canonical domain confirmation:** proof of ownership of `ecellpsgim.in`, auto-renew on, and a decision for `www` and `pages.dev` (§2). | Domain owner | §2, §8 |
| B4 | **Email:** transactional SMTP account (Brevo proposed), a verified sender address, and the notification address(es). | Account owner | §4, §6 |
| B5 | **Production deploy source:** which pushed branch production deploys come from (`origin/ECell` today), who may run the deploy tool, and who reviews before it runs. | Technical Head | §5, §8 |
| B6 | **Backup location:** where encrypted `pg_dump` files are kept, and who holds access. | Technical Head | §9 |
| B7 | **Restore drill passed** before any real student data is accepted (§9.4). | Technical Head | Phase C |

The contact feature is **excluded** from this deployment: it is not committed, it is not in the proxy allowlist, and none of its variables are set.

---

## 1. Topology

```
Browser ──https──► ecellpsgim.in (Cloudflare Pages, Direct Upload, label "ECell")
                     │  static site (prerendered Angular)
                     └─ /api/* ─► Pages Function functions/api/[[path]].js
                                     │ https only (refuses http except loopback)
                                     │ adds X-Ecell-Proxy-Secret
                                     ▼
                         Render web service (Docker, backend/Dockerfile, gunicorn)
                                     │ TLS (sslmode=require enforced)
                                     ▼
                               Neon Postgres (direct endpoint)
```

The browser only ever talks to the site's own origin, so **CORS is not used and must not be enabled.** Do not install `django-cors-headers`.

**Facts verified 2026-10-10:**
- The Pages project `psgim-ecell` has **no Git provider**, so pushing does not deploy.
- Production deployment `c4ff8325` is commit `e28a51f`.
- `ecellpsgim.in` is attached and serving.

---

## 2. Canonical domain: `https://ecellpsgim.in` (provisional, B3)

**Observed (2026-10-10, public DNS/HTTP/WHOIS only):**
- Registered 2026-10-06 at Hostinger, **expires 2027-10-06**.
- DNS is on Cloudflare (`lou`/`tess.ns.cloudflare.com`).
- The apex serves the site with valid TLS.
- `www.ecellpsgim.in` returns **522**: a proxied DNS record with no Pages attachment.

**Steps for the domain owner** (no change has been made):
1. **Verify ownership.**
   - Sign in to the Hostinger account that holds `ecellpsgim.in`.
   - Record the registrant and the account email, which should be E-Cell-owned.
   - Confirm the Cloudflare account that holds the DNS zone is the same one that owns the Pages project.
2. **Enable auto-renew and a renewal reminder.** If the registrar allows, extend the registration to several years. Printed QR codes will outlive a 1-year registration.
3. **Fix `www`.** Choose one:
   - **(a)** attach `www.ecellpsgim.in` as a second custom domain on the Pages project (Pages → Custom domains), plus a redirect `www → apex`; or
   - **(b)** delete the `www` record.

   Until then it fails with 522.
4. **Decide the treatment of `pages.dev`.** Recommended: keep `psgim-ecell.pages.dev` working (rollback and preview aliases depend on it), but treat `ecellpsgim.in` as canonical:
   - `FRONTEND_URL` and invitation/reset links use the custom domain;
   - canonical tags and the sitemap move to it (deferred item C8);
   - an optional redirect `pages.dev → ecellpsgim.in` for the production alias only, decided separately because it affects preview URLs.
5. **QR codes:** none may be printed against `pages.dev` or a preview hostname (decision D4).

---

## 3. Environment and configuration

### 3.1 Render web service (backend)

| Variable | Purpose | Set by |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod`; already the Dockerfile default | (image) |
| `DJANGO_SECRET_KEY` | Django signing key. Prod refuses to start without it. | Owner, generated value |
| `DATABASE_URL` | Neon **direct** connection string. Prod forces `sslmode=require` and refuses weaker modes. | Owner |
| `DB_CONN_MAX_AGE` | Optional. Persistent-connection seconds (default 60 direct, 0 pooled). | — |
| `DB_DISABLE_SERVER_SIDE_CURSORS` | Optional. Default true only for a `-pooler.` host. | — |
| `ALLOWED_HOSTS` | Extra hosts. Render's own host comes from `RENDER_EXTERNAL_HOSTNAME`, which Render sets automatically **(verify)**. | Owner |
| `CSRF_TRUSTED_ORIGINS` | `https://ecellpsgim.in,https://psgim-ecell.pages.dev`, plus a preview origin only during §7 | Owner |
| `FRONTEND_URL` | `https://ecellpsgim.in`, the base of invitation and reset links | Owner |
| `CLIENT_IP_HEADER` | `CF-Connecting-IP` | Owner |
| `PROXY_SHARED_SECRET` | Same value as on Pages. Client IP is trusted only when it matches. | Owner, generated value |
| `ORG_TIMEZONE` | `Asia/Kolkata` | Owner |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend`. **The default is console, which the bootstrap command refuses.** | Owner |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_TIMEOUT` | SMTP relay (Brevo: §4) | Owner |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP login and SMTP key | Owner |
| `DEFAULT_FROM_EMAIL` | Verified sender, e.g. `PSGIM E-Cell <no-reply@ecellpsgim.in>` (B4) | Owner |
| `JOIN_NOTIFY_EMAIL` | Optional. Inbox for Join submissions; unset means stored only. | Owner (B4) |
| `CLOUDINARY_*` | Optional for A2. Editor uploads fail without them. | Later |
| ~~`CONTACT_NOTIFY_EMAIL`, `CONTACT_FROM_EMAIL`~~ | **Not set.** Contact is excluded. | — |

Generate `DJANGO_SECRET_KEY` and `PROXY_SHARED_SECRET` on the owner's own machine, for example with `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`. Paste them straight into the dashboards. Never paste them into chat or a file in this repository.

**Service settings:**

| Setting | Value |
|---|---|
| Runtime | Docker, root directory `backend`, Dockerfile `backend/Dockerfile` |
| Plan / region | Starter; region co-located with Neon (e.g. Singapore) **(verify)** that Render and Neon share a region near India |
| Health check path | `/api/v1/health` (exempt from the HTTPS redirect) |
| Pre-deploy command | `python manage.py migrate --noinput && python manage.py createcachetable && python manage.py seed_rbac && python manage.py seed_content_block_types` **(verify)** that this runs before the new version takes traffic |
| Start command | The Dockerfile `CMD` (gunicorn, 2 workers, `$PORT`) |
| Auto-deploy | **Off.** Deploys are manual, of a named commit, after review (B5). |

### 3.2 Cloudflare Pages (proxy), Preview and Production environments separately

| Variable | Purpose |
|---|---|
| `API_ORIGIN` | `https://<service>.onrender.com`. **Must be https**; the proxy now refuses http except loopback, answering 503. |
| `PROXY_SHARED_SECRET` | Encrypted. Same value as Render. |

Pages applies variable changes to the **next deployment**. **(verify)** whether a rollback to an older deployment uses that deployment's variables or the current ones; test this on a preview in §7.

### 3.3 Angular

There are no runtime variables. The site origin is hardcoded to `psgim-ecell.pages.dev` for canonical tags and the sitemap (deferred item C8).

### 3.4 Proxy allowlist

`auth`, `users`, `permissions`, `roles`, `role-assignments`, `verticals`, `academic-years`, `memberships`, `audit`, `settings`, `schema`, `docs`, `content`, `public`, `join`, `health`. **Not** `contact`, and never `internal`.

---

## 4. Email: dedicated transactional SMTP (Brevo proposed; B4)

1. Create the Brevo account under the E-Cell-owned email (B1).
2. **Sender:** authenticate the domain `ecellpsgim.in` in Brevo by adding the SPF, DKIM and DMARC records it lists to the Cloudflare DNS zone.
   - Do not send from `@gmail.com` through a third-party relay; it cannot align SPF/DKIM and lands in spam.
   - Add a DMARC policy, starting at `p=none` with reports.
3. Create an **SMTP key** (not the REST API key, which the relay rejects).
   - Relay `smtp-relay.brevo.com`, port `587`, `EMAIL_USE_TLS=true` **(verify current values in Brevo)**.
   - The login is the account's SMTP login.
4. Set the `EMAIL_*` variables in Render (§3.1).
5. **Verify** (in §6): the bootstrap invitation arrives, is not in spam, and the link opens `https://ecellpsgim.in/platform/reset-password?...`.
6. **Note:** Render's free instances may block outbound SMTP **(verify)**. A free *staging* service may therefore be unable to send mail; production Starter is unaffected.

---

## 5. Deploying the site (frontend + proxy): commit-based only

`npm run deploy` and `npm run deploy:preview` now run `tools/deploy-from-commit.mjs`. It **never** builds the working tree:

1. Resolves `--commit` to a full SHA. For production, it requires the commit to be on the named pushed branch (`--from-branch origin/<branch>`). Unpushed commits are refused for production and allowed for previews only with `--allow-unpushed`.
2. Checks the commit out into a fresh detached `git worktree` in a temp directory.
3. Runs `npm ci`, the web unit tests, the Pages Function tests and the production build there.
4. Refuses if the build modified tracked files.
5. Only with `--deploy` (and, for production, `--confirm <full-sha>` typed out) does it run `wrangler pages deploy` **from that worktree**. Both the static files and the `/api` Function come from the commit.
6. Always removes the worktree.

Without `--deploy` it is a rehearsal that uploads nothing and prints the exact command. Rehearsed on `a9988dd` on 2026-10-11: 92 web tests, 71 function tests, 30 prerendered routes, worktree removed, nothing uploaded.

```bash
# Rehearsal (uploads nothing)
npm run deploy:preview -- --commit <sha> --label a2-preview
npm run deploy -- --commit <sha> --from-branch origin/ECell
# Real deployments
npm run deploy:preview -- --commit <sha> --label a2-preview --deploy
npm run deploy -- --commit <sha> --from-branch origin/ECell --deploy --confirm <full-sha>
```

Pushing a branch never deploys; the Pages project has no Git integration. Requirements:
- `wrangler` must be authenticated as an **E-Cell-owned** Cloudflare account. Today it is logged in as a personal-looking account with missing scopes.
- Whoever runs a production deploy records the SHA in the deployment log (§11).

---

## 6. Initial administrators (B2, B4)

Run in the Render Shell of the production service **(verify)** that the Starter plan provides a shell, otherwise use a one-off job. There is no web endpoint for this, and `DEBUG` stays off.

```bash
python manage.py bootstrap_super_admin --email <admin-1> --full-name "<Name 1>" --dry-run
python manage.py bootstrap_super_admin --email <admin-1> --full-name "<Name 1>"
python manage.py bootstrap_super_admin --email <admin-2> --full-name "<Name 2>"
```

**What the command guarantees** (tested in `apps/accounts/tests/test_bootstrap_super_admin.py`):
- At most **2** Super Admins via bootstrap; a third run is refused and audited.
- No password argument. Each person sets their own via the 1-hour invitation.
- The token or link is never printed. It refuses console, file-based and dummy mail backends.
- SUPER_ADMIN is assigned GLOBAL, with no academic year and no end date. Existing passwords are untouched and inactive accounts are refused.
- Every attempt is audited (`governance.bootstrap_super_admin`). If the invitation fails, the role stays and `--resend` re-sends it.

**Verification:**
1. Each admin receives the email.
2. They set a password at `https://ecellpsgim.in/platform/reset-password`.
3. They sign in at `/platform/loginpage`.
4. They see Administration.
5. A third bootstrap attempt is refused.

---

## 7. Deployment order

### 7.1 Pre-deployment checklist

- [ ] B1–B6 closed. Each account owner and admin identity recorded in `17_DEVELOPER_HANDOVER.md` §8.
- [ ] The A2 commit is reviewed, committed and pushed to the agreed branch (B5). CI is green on it.
- [ ] `git status` is irrelevant to deployment (the tool builds the commit), but the commit contains **no** contact-feature code.
- [ ] Locally on that commit: backend `pytest`, `manage.py check`, `makemigrations --check`, web `ng test`, `npm run test:functions`.
- [ ] Deploy-tool rehearsal on the exact SHA succeeds.
- [ ] Secrets generated by the owner and entered only in the dashboards.
- [ ] Brevo domain authentication shows verified (§4).
- [ ] Rollback owner and contact on standby (§10).

### 7.2 Order

| Step | Action | Who |
|---|---|---|
| 1 | **Neon:** create the project in the chosen region, the database `ecell` and a dedicated app role. Copy the **direct** connection string. | Owner |
| 2 | **Render:** create the service per §3.1 with auto-deploy **off**; set variables; deploy the reviewed commit manually. The pre-deploy command migrates and seeds roles and block types. | Owner |
| 3 | **Backend checks** (§8.1), directly against the `onrender.com` host. | Engineer |
| 4 | **Backup 0** (§9.2): an empty-but-migrated database. | Engineer |
| 5 | **Initial administrators** (§6). | Owner + admins |
| 6 | **Content import** (§7.3), with backups before and after. | Engineer |
| 7 | **Pages Preview:** set the preview variables; temporarily add the preview origin to `CSRF_TRUSTED_ORIGINS`; `npm run deploy:preview -- --commit <sha> --label a2-preview --deploy`; run §8.2 on `https://a2-preview.psgim-ecell.pages.dev`; test whether rollback keeps the variables (§3.2). | Engineer |
| 8 | **Pages Production:** set the production variables; `npm run deploy -- --commit <sha> --from-branch origin/<branch> --deploy --confirm <full-sha>`. | Owner / Technical Head |
| 9 | **Post-deployment checks** (§8.2) on `ecellpsgim.in` **and** `psgim-ecell.pages.dev`. Remove the preview origin from `CSRF_TRUSTED_ORIGINS`. | Engineer |
| 10 | **Record the deployment** (§11). | Engineer |

### 7.3 Content import

Only confirmed content (decision A-4). Run in the Render Shell after the admins exist.

```bash
python manage.py migrate_legacy_content --only event --exclude-pending --dry-run
#   expect: "6 selected, …, 6 to create" and a "skip … (illustrative (pending))" line for
#   founders-on-campus-sep, bootcamp-oct, nec-kickoff, idea-clinic-jul, ideathon-2026-finals
python manage.py migrate_legacy_content --only event --exclude-pending --actor-email <admin-1>
#   expect: "6 created, 0 updated, 0 unchanged; N excluded."
# Optional, only if the 16 institutional pages are approved for the CMS editor:
python manage.py migrate_legacy_content --only page,nec --exclude-pending --dry-run
python manage.py migrate_legacy_content --only page,nec --exclude-pending --actor-email <admin-1>
```

- Sample blog posts are never imported: they are `pending`, and `blog` is not selected.
- The import publishes directly and audits each item (`content.migrated`). Re-running is a no-op (`unchanged`).
- Verify with `curl -s https://<service>.onrender.com/api/v1/content/public/dynamic/published_events_past`: 6 results, none with `"pending": true`.

---

## 8. Verification

### 8.1 Backend, directly on `https://<service>.onrender.com`

- [ ] `GET /api/v1/health` returns `200 {"status":"ok","database":"ok"}` with `Cache-Control: no-store`.
- [ ] Render shows the service **Healthy**: its internal probe reaches `/api/v1/health`, which Django exempts from the HTTPS redirect. Public `http://` requests may be redirected by Render's own edge before reaching Django **(verify)**; either way, no public path may serve content over plain http.
- [ ] `GET /api/v1/auth/me` returns 401. `GET /api/v1/schema` returns 401/403 (docs are not public in prod).
- [ ] Response headers include `Strict-Transport-Security` and `X-Content-Type-Options`.
- [ ] A request with a fake `X-Ecell-Proxy-Secret` and a spoofed `CF-Connecting-IP` is logged with the real client IP (audit or throttle).
- [ ] Render logs show no tracebacks and no `DisallowedHost`.

### 8.2 Through the site (preview, then production)

- [ ] `GET /api/v1/health` through the proxy returns 200.
- [ ] `/events` shows the 6 confirmed events, with no "Illustrative" rows and no error state. The homepage teaser shows events.
- [ ] Hard refresh `/events` and `/blogs`: the correct pages, not the homepage.
- [ ] Sign in at `/platform/loginpage` as a Super Admin; the session cookie is `Secure; HttpOnly; SameSite=Lax` and host-only.
- [ ] A CSRF-protected write succeeds (e.g. sign out). The same write with a missing `X-CSRFToken` returns 403 `csrf_failed`.
- [ ] Forgot-password for a real admin: the email arrives and the link uses `https://ecellpsgim.in`. For an unknown address the same 202 message comes back and no mail is sent.
- [ ] `/api/v1/contact` returns 404 from the proxy (contact excluded).
- [ ] The audit log (Administration) shows the bootstrap, import and sign-in entries.
- [ ] Error state: temporarily remove `API_ORIGIN` on the **preview** only, redeploy the preview, and confirm the "Events are temporarily unavailable" + Retry state. Then restore it.

---

## 9. Backups and recovery

### 9.1 Options available

| Option | What it gives | Limits |
|---|---|---|
| Neon built-in history / point-in-time restore | Restore or branch the database to an earlier moment | The Free-plan window is short (ADR-008 recorded 6 h; **verify the current value**). Not a backup you hold. |
| Neon branch before risky steps | Instant copy-on-write snapshot | Lives inside the same Neon project and account |
| **Manual `pg_dump` (custom format)** | A file you hold, restorable anywhere | Must be encrypted at rest and stored off-platform (B6) |
| Scheduled `pg_dump` to R2 (ADR-008) | Daily off-site copies | **Not built yet.** Required before real student data (B7). |

### 9.2 Manual backup (before and after import)

Use a client of the same major version as the server (Postgres 17), e.g. the `postgres:17` image. Keep the connection string in an env file, not on the command line, so it stays out of shell history:

```bash
docker run --rm --env-file neon.env -v "$PWD/backups:/b" postgres:17 \
  sh -c 'pg_dump "$DATABASE_URL" --format=custom --no-owner --file=/b/ecell-$(date -u +%Y%m%dT%H%M%SZ).dump'
docker run --rm -v "$PWD/backups:/b" postgres:17 pg_restore --list /b/<file>.dump | head   # archive is readable
```

Take one before the import (backup 0/1) and one after (backup 2). Record the file names, sizes and SHA-256 checksums in the deployment log. Encrypt the files and store them per B6, never in this repository.

### 9.3 Recovery

1. **Bad data, service healthy:** restore into a *new* Neon branch or database from the last good dump (`pg_restore --clean --if-exists --no-owner -d "$TARGET_URL"`). Verify the row counts in §9.4, then repoint `DATABASE_URL` in Render and redeploy.
2. **Recent mistake within Neon's window:** create a branch at the timestamp before the mistake, verify, then promote or repoint.
3. Never restore over the live database without a fresh dump of its current state first.

### 9.4 Restore drill (B7, required before real student data)

1. Restore the latest dump into a scratch database (a local `postgres:17` or a throwaway Neon branch).
2. Run `python manage.py migrate --check` against it (no unapplied migrations).
3. Compare counts with production: `accounts_user`, `rbac_roleassignment`, `content_contentitem`, `content_eventdetail`, `audit_auditlog`.
4. Start the app against it and sign in.
5. Record the duration, result and operator. Repeat each academic year and after any schema change.

---

## 10. Rollback

| Situation | Action | Effect |
|---|---|---|
| Frontend regression | Cloudflare Pages → Deployments → roll back to the previous production deployment (or redeploy the previous SHA with the tool) | The static site and Function revert |
| API cutover must be undone | Remove `API_ORIGIN` from the Pages **production** variables and redeploy the same SHA (§3.2: variables apply on deploy) | `/api/*` returns 503. The site shows the A1 "temporarily unavailable" states; nothing else breaks. |
| Backend release regression | Render → roll back to the previous deploy | Migrations are additive (expand → contract), so the previous code runs on the newer schema |
| Data problem | §9.3 | — |
| Credential exposure | Rotate the secret (Render or Pages), redeploy, review the audit log; for `PROXY_SHARED_SECRET`, rotate both sides together | — |

The deploy log (§11) must name the SHA to roll back to before any production deploy starts.

---

## 11. Deployment log (template, kept in the KB, not here)

Date/time (UTC) · operator · target · commit SHA · Pages deployment id · Render deploy id · migrations applied · backup files and checksums · checks passed · issues · rollback SHA.

---

## 12. Staging

- **Recommended before production:** a Render **Free** web service plus a **separate** Neon project (ADR-008), with production-identical variables except the secrets, database and `FRONTEND_URL`. Pair it with a Pages preview label.
- Use it to settle every **(verify)** item: the probe behaviour, pre-deploy ordering, the shell, `RENDER_EXTERNAL_HOSTNAME`, whether Pages rollback keeps variables, and SMTP egress.
- Staging never holds real student data.

---

## 13. GitHub ownership (recommendation only; nothing moved)

**Recommendation:** create an **E-Cell-owned GitHub organisation** (owner: an E-Cell role email, plus at least two organisation owners). Transfer `psgim-ecell-website` (and the legacy `E-Cell` repository, if it is kept) into it.

**Requirements and effects:**
- **Before the transfer:** the current owner must hold admin rights on both sides. The organisation must not already have a repository with the same name.
- **Redirects:** GitHub redirects the old URLs, but local clones should update their remote (`git remote set-url origin <new>`).
- **What breaks or must be re-granted:**
  - Render's GitHub access (install the Render GitHub app on the organisation);
  - any GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), which must be re-created at the organisation or repository level;
  - deploy keys and webhooks (none exist today).
- **The Pages project is Direct Upload,** so the transfer does not affect it.
- **Best timing:** before Render is connected to GitHub, so the integration is created once under the organisation.

---

## 14. Engineering prepared for A2 (local, uncommitted at time of writing)

| Item | Where |
|---|---|
| Health endpoint, HTTPS-redirect exemption, Render host, prod DB TLS | `apps/core/views.py`, `config/urls.py`, `config/settings/prod.py` |
| Neon-aware database configuration | `config/database.py`, `config/settings/base.py`, `backend/.env.example` |
| Proxy: `health` allowed; https-only upstream | `functions/api/[[path]].js` |
| First-Super-Admin bootstrap | `apps/accounts/management/commands/bootstrap_super_admin.py` |
| Importer `--only` / `--exclude-pending` / `--dry-run` | `apps/content/management/commands/migrate_legacy_content.py` |
| Commit-based deploy tool | `tools/deploy-from-commit.mjs`, root `package.json` |
| Tests | `apps/core/tests/test_health.py`, `apps/core/tests/test_database_config.py`, `apps/accounts/tests/test_bootstrap_super_admin.py`, `apps/content/tests/test_import_selection.py`, `tools/tests/api-proxy.test.mjs`, `tools/tests/deploy-from-commit.test.mjs` |

**Deferred:**
- **C7:** `render.yaml` and CI formatting cleanup.
- **C8:** centralising the site origin, canonical tags and the sitemap.
