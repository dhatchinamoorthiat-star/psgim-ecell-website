# 15 — Migration Plan

## 1. Safety

- Baseline tag: `baseline/pre-platform-2026-09-25` (local, on commit `1914852`). **Push it** (`git push origin baseline/pre-platform-2026-09-25`) once the remote is confirmed.
- Uncommitted `/blogs/` WIP exists in the working tree — commit or stash it before starting Phase 1.
- Work on branch `platform/phase-1`; production (`ECell` Pages branch) only deploys from `main` after verification.
- Control Room (`ecell/`) keeps running untouched until each feature has a verified replacement. Take a `pg_dump` of the Supabase DB before any data migration.

## 2. Content classification

| Item | Source today | Class | Target |
|---|---|---|---|
| Brand name, logo, tagline, colours, fonts | site.data / tokens.css | STATIC_SYSTEM | code |
| Nav structure, footer structure | site.data `nav` | STATIC_SYSTEM | code |
| Address, contact email, social handles/URLs | site.data | CMS (site_setting) | Organization settings |
| Notice bar | site.data `notice` | CMS (announcement) | ContentItem |
| Home hero/intro copy | home.data | CMS (page blocks) | ContentItem `page:home` |
| About / Origin / Vision-Mission / Reach / Spotlight / History / Podcast / Website-AV | about.data | CMS (page blocks) | ContentItem per page |
| Initiatives (7) + stages (4) | initiatives.data | CMS (initiative) / stages STATIC | Initiative entity |
| Events (5) | events.data | CMS (Event) | Event + ContentItem |
| Blogs (1 sample) | blogs.data (WIP) | CMS (Blog) | Blog |
| Faculty, patron, roles, NEC team (23) | team.data | CMS (team_profile) + Membership | User/Membership where they're members; TeamProfile for faculty |
| Stats, NEC drive targets | stats.data | CMS (stats block) | ContentItem |
| NEC page | nec.data | CMS (page blocks) | ContentItem `page:nec` |
| Gallery tiles/albums | gallery.data | CMS (gallery_album) | MediaCollection |
| Roadmap (/soon/) | roadmap.data | CMS (page blocks) | ContentItem |
| Search index | search.data | derived | generated from published content |
| QR tool, theme, cursor, motion | components | STATIC_SYSTEM | code |
| Hero video `meet-the-team.mp4` | web/public (Git) | CMS media | Cloudinary; remove from Git later |

Every `pending: true` → `is_verified=false`. Nothing gets verified during migration; only humans flip it.

## 3. Phased steps

1. **Phase 1a** — `backend/` Django skeleton, Postgres, custom User, auth endpoints, RBAC tables + policy engine + seed roles/permissions, Verticals, AcademicYear, AuditLog. Privilege-escalation tests from day one.
2. **Phase 1b** — Angular `/platform` shell, login/logout/forgot/reset, `/auth/me`, permission-aware nav, admin screens for users/verticals/roles.
3. **Phase 2a** — CMS core (ContentItem/Version/workflow/preview/tick/deploy hook). Seed script `manage.py import_legacy_content` reads a JSON export of `web/src/app/core/data/*` (exported by a small Node script — no hand re-typing).
4. **Phase 2b** — Public site reads `ContentStore` from the snapshot; verify byte-level parity of rendered text against the baseline build (diff of prerendered HTML text nodes).
5. **Phase 2c** — Events, Speakers, Blogs, Gallery, Media editors. Import Control Room `activities`, `speakers`, `organisations`, `media_assets`.
6. **Phase 3** — Projects/workstreams/tasks/requests (import `blueprints`, `requests`), notifications. Port registration/check-in/attribution; then retire those Control Room routes.
7. **Phase 4** — Audit UI, succession, KB, analytics, approval rules. Import `audit_log`, `academic_years`, `team_members`, `committee_members`.
8. **Phase 5** — hardening, a11y, SEO (dynamic sitemap), performance, docs. Decommission Control Room.

## 4. Parity checklist (run after each phase)

All 18 current routes 200 · every text string in baseline HTML still present
(scripted diff) · pending flags still render · theme toggle · QR generator ·
sitemap includes all public routes · Lighthouse perf/a11y not below baseline.
