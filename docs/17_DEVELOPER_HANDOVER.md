# 17 — Developer Handover

Written for a student who has never seen this project. Sections marked
*(Phase n)* describe things that do not exist yet; update them as they land.

## 1. What this is

The PSGIM E-Cell Platform: the public website (Angular, `web/`), a Django
API (`backend/`) and a members' platform at `/platform` (Angular, same app).
Start with `ARCHITECTURE_DECISION_RECORD.md`, then
`PHASE_1_IMPLEMENTATION_NOTES.md` for what exists today.

## 2. Local setup

Public site only:

```bash
npm install --prefix web
```

```bash
npm run dev
```

Opens http://localhost:4200. Public content is still in `web/src/app/core/data/` until the CMS lands (Phase 2).

Platform + API: follow `PHASE_1_IMPLEMENTATION_NOTES.md` §2 exactly (venv, `docker compose up -d db`,
`migrate`, `seed_rbac`, `create_dev_user` or `seed_dev_demo`, `runserver`, `npm run dev`), then open
http://localhost:4200/platform/. `ng serve` forwards `/api` to Django (`web/proxy.conf.json`).

## 3. Deploying

See `16_DEPLOYMENT.md`. Remember: production branch is **`ECell`**.

## 4. RBAC in one minute

Permissions are strings in `backend/apps/rbac/catalogue.py`; roles bundle them there too, and
`python manage.py seed_rbac` writes both to the database. A user gets a role *in a scope*
(`RoleAssignment`: global / a vertical / later an event or project). The single decision point
is `backend/apps/rbac/policy.py` (`has_perm`, `scopes_for`). Every view subclasses
`PermissionedAPIView` and declares `required_perms` per HTTP method — a test fails if one is
missing. Anti-escalation rules live in `backend/apps/rbac/services.py`. Never write
`if user.role == ...` (a test scans for it).

## 5. Common tasks (Phase 1+)

- **Add a vertical** — no code: `/platform/admin/verticals` → Add vertical (needs `vertical.manage`).
- **Assign a vertical head** — `/platform/admin/assignments` → Assign a role → Vertical Head → the vertical (needs `vertical_head.assign`; audited).
- **Add a permission** — add a constant + description in `rbac/catalogue.py`, add it to the right roles there, run `seed_rbac` (also on deploy), use it in a view's `required_perms` / `self.require()`, add rows to `rbac/tests/test_escalation.py`, and update `docs/04_PERMISSION_MATRIX.md`.
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
