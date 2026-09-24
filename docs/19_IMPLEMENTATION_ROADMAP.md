# 19 — Implementation Roadmap

Each phase ends with: tests green · build green · parity checklist (doc 15 §4)
· permission tests · responsive check · docs updated. No phase starts until
its blocking decisions are recorded in `ARCHITECTURE_DECISION_RECORD.md` / `PHASE_1_AUTHORIZATION.md`.

| Phase | Deliverables | Blocked by |
|---|---|---|
| **0 — Audit & docs** ✅ | `docs/00–19`, baseline tag, decision package (ADR record, ADR-008/009, org structure, Phase 1 authorization) | — |
| **1a — Backend foundation** ✅ (branch `platform/phase-1`, see `PHASE_1_IMPLEMENTATION_NOTES.md`) | `backend/` Django 5 + DRF, Docker Postgres, custom User, session auth + CSRF, forgot/reset, RBAC tables + policy engine + seeded roles/permissions, Vertical, AcademicYear, Membership, AuditLog, escalation test suite, `.env.example`, OpenAPI | — (resolved 2026-09-25) |
| **1b — Platform shell** ✅ (same branch; second factor/PIN port still open) | `/platform` lazy route tree, login/logout/reset screens, `/auth/me`, permission-aware nav, Admin: users, verticals, roles, assignments. Pages Function `/api` proxy on a preview branch | 1a |
| **2a — CMS core** | ContentItem/Version, block registry, workflow, approvals, preview, tick endpoint + Cron Worker, deploy hook, legacy content importer | 1b |
| **2b — Public site on CMS** | `ContentStore` + snapshot prerender; parity diff vs baseline; dynamic sitemap; single `_headers` | 2a |
| **2c — Structured content** | Events (+detail pages), Speakers, Blogs, Initiatives, Gallery, Media library (Cloudinary signed uploads), SEO fields | 2a |
| **3 — Operations** | Projects, Workstreams, Tasks, Requests, event workspace, notifications; port registration/attribution/check-in from Control Room | 2c |
| **4 — Governance** | Audit UI, academic-year rollover, succession, KB, approval-rule UI, analytics | 3 |
| **5 — Polish** | a11y audit, performance budgets, security review, E2E suite in CI, handover docs final, Control Room decommission | 4 |

## Suggested first slice after decisions (≈1 sprint)

1. ~~Commit the `/blogs/` WIP~~ (done, `2e91ae7`); branch `platform/phase-1`.
2. Scaffold `backend/` (config, core, accounts, rbac, verticals, memberships, audit).
3. Write escalation tests **before** the admin views.
4. Seed: 6 system roles, permission catalogue, verticals from the confirmed list (question 5 in doc 01).
5. Local dev proxy in `web/proxy.conf.json`.

## Quick wins (done 2026-09-25)

- Sitemap now derived from the prerendered build output (17 public routes; `/control/` excluded).
- `web/public/_headers` is the single source; the postbuild fallback copies it instead of writing a divergent DENY copy.
- Update the root README colour table to the current tokens.
