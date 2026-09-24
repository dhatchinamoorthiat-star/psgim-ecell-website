# 17 — Developer Handover

Written for a student who has never seen this project. Sections marked
*(Phase n)* describe things that do not exist yet; update them as they land.

## 1. What this is

The PSGIM E-Cell Platform: the public website (Angular, `web/`) and, from
Phase 1, a Django API (`backend/`) that powers a members' platform at
`/platform`. Start with `00_AUDIT.md` and `02_SYSTEM_ARCHITECTURE.md`.

## 2. Local setup (today)

```bash
npm install --prefix web
```

```bash
npm run dev
```

Opens http://localhost:4200. Content is in `web/src/app/core/data/` until the CMS lands.

*(Phase 1)* Backend: `cd backend && cp .env.example .env && docker compose up -d db && python -m venv .venv && pip install -r requirements.txt && python manage.py migrate && python manage.py seed_rbac && python manage.py runserver`.

## 3. Deploying

See `16_DEPLOYMENT.md`. Remember: production branch is **`ECell`**.

## 4. RBAC in one minute

Permissions are strings in `backend/apps/rbac/permissions.py`. Roles bundle
them. A user gets a role *in a scope* (global / a vertical / an event). Views
declare the permission they need. Never write `if user.role == ...`.

## 5. Common tasks (Phase 1+)

- **Add a vertical** — no code: Platform → Admin → Verticals → New.
- **Assign a vertical head** — Admin → Verticals → *vertical* → Assign head (audited).
- **Add a permission** — add constant in `permissions.py`, data migration to attach to roles, use in a view, add a test in `rbac/tests/test_escalation.py`.
- **Add a content block type** — JSON schema in `content/blocks/`, renderer in `web/src/app/shared/ui/blocks/`, register in both registries, add to the editor palette.
- **Add an API endpoint** — view + serializer in the app, `required_perm`, URL, test; schema regenerates automatically.
- **Update Angular** — `npx ng update @angular/core @angular/cli` on a branch; run build + tests + parity checklist (doc 15 §4).

## 6. Things that will bite you

- QR generator: keep the UTF-8 encoder switch and integer module sizes (see root README).
- Pages branch `ECell` vs `main`.
- `web/public/_headers` is the only headers source; `postbuild.mjs` copies it if missing and never writes its own.
- The sitemap is derived from the prerendered output; add a route and it appears (edit `EXCLUDED` in `postbuild.mjs` for noindex routes).
- iOS zooms on inputs < 16px.

## 7. Backups & rollback — `16_DEPLOYMENT.md`.

## 8. Who owns what

Keep an up-to-date table here: Cloudflare account owner, GitHub org owners, DB owner, Cloudinary owner, email sender owner, domain registrar. **Currently the Control Room repo is under a personal GitHub account (`dhatchinamoorthiat-star`) — move to an E-Cell org.**

## 9. Technical Head handover checklist

Transfer/verify: GitHub org ownership · Cloudflare account membership (add successor as Admin, then remove self) · DB console access · Cloudinary · email provider · domain · all secrets rotated (`DJANGO_SECRET_KEY`, API tokens, tick secret) · walk successor through a deploy and a rollback · record in KB.
