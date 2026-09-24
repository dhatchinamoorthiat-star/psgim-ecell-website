# 01 — Product Requirements

Product: **PSGIM E-Cell Platform** (internal concept name "E-Cell OS"; public brand stays **PSGIM E-CELL**).

Centralised governance and technical authority + decentralised execution and
content ownership. Must keep working after the original developers graduate.

## Users

| Persona | Needs |
|---|---|
| Visitor | premium, fast, accurate public site |
| Member | see and update assigned work, contribute content |
| Vertical Head | run their vertical's events/content/tasks without Technical |
| Admin Head | coordinate across verticals |
| Technical Head / Platform Admin | own the platform, infra, security, block types |
| Super Admin | organisational governance, roles, audit |
| Faculty advisor | *assumed* reviewer/approver — confirm (see risks) |

## Scope by surface

- **Public:** Home, About (+Origin, Vision & Mission, Reach, Spotlight, History), Initiatives (+Podcast, Website AV, Gallery), Events (+detail pages — new), Speakers (new), Team, Blogs, NEC, Announcements (new), Contact, Join (interest form when a real destination exists).
- **Platform:** Dashboard, Profile, My Vertical, My Tasks, My Events, Projects, Workstreams, Requests, Notifications, Content, Media, KB, Approvals, Analytics.
- **Admin:** People, Roles, Permissions, Verticals, Academic Years, Leadership/Succession, Content Governance, Approval Rules, Audit Logs, Settings.

## Success criteria

The 20 criteria in the brief §72 are adopted verbatim as acceptance tests; each maps to an E2E or permission test in `18_TESTING_STRATEGY.md`.

## Non-goals (V1)

Chat/WhatsApp replacement · AI-generated institutional content · OAuth/SSO (after auth is stable) · page-builder for arbitrary layouts · native apps.

## Open questions / unresolved risks

1. **ADR-001** — fate of the Control Room (`ecell/`). Blocking for Phase 1.
2. Backend host (ADR-008) — needs a decision and possibly an account in the E-Cell's name.
3. Custom domain? Today only `psgim-ecell.pages.dev`. Same-origin plan works either way.
4. Faculty role and approval authority — who must approve public content?
5. Actual verticals list — brief lists 6; `about.data.ts` says "Seven verticals". **Which seven?**
6. Leadership turnover month (Control Room says October).
7. Ownership of GitHub/Cloudflare/Cloudinary accounts (currently personal).
8. All `pending: true` facts still need human verification.
9. Staffing: a Django backend needs at least one Python-literate Technical member per year.
