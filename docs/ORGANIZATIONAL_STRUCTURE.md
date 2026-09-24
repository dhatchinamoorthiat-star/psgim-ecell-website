# Organizational Structure — Evidence Report

- **Status:** Vertical list **NOT CONFIRMED**, marked **DECISION REQUIRED FROM E-CELL LEADERSHIP**
- **Date:** 2026-09-25

## Sources searched
`web/src/app/core/data/*` (public site), `README.md`, `CONTENT-PLAN.md`,
`ecell/` (Control Room: migrations, seed scripts, source, README), and the
master brief. `ecell/E-Cell-Control-Room.pdf` could **not** be text-extracted
(no `pdftotext` available). A human should check it.

## The four sources disagree

| # | Source | Count | Names |
|---|---|---|---|
| S1 | Master brief (§05, "initial verticals *may* include") | 6 | Events, Media, Technical, Podcasts, Operations, Public Relations |
| S2 | Control Room `ecell/scripts/seed-phase2.mjs` ("The six standing verticals") | 6 | Marketing & Outreach, Content & Design, Technical, Operations, Corporate Relations, Documentation |
| S3 | Public site `about.data.ts` lines 90–92, 130 ("Seven verticals. One bigger picture.") | 7 | **not named anywhere** |
| S4 | Public site `team.data.ts` `roles` (working roles, not called verticals) | 6 | Lead, Technical, Content & outreach, Design & social, Events, Analytics |

Also: `ecell/.../admin/teams/page.tsx` says "Standing verticals for 2026–27". Its
data comes from S2 seeded into the `teams` table. Whether the live Supabase DB
still matches S2 is **UNVERIFIED** (no DB access was used).

## Per-vertical evidence

| Vertical | Evidence found | Current head/lead model | Confidence |
|---|---|---|---|
| Technical | S1, S2, S4 (named: Dhatchina Moorthi TA) | S2: `team_members.is_lead` per academic year; S4: named role holder | **High** that it exists |
| Operations | S1, S2 | `is_lead` | Medium-high |
| Events | S1, S4 (role unfilled) | none recorded | Medium |
| Media / Content & Design / Design & social | S1 "Media"; S2 "Content & Design"; S4 "Design & social". Possibly one vertical under three names | `is_lead` (S2) | **Low**: naming unresolved |
| Marketing & Outreach / Public Relations / Content & outreach | S1 "PR"; S2 "Marketing & Outreach"; S4 "Content & outreach". Possibly one vertical, possibly two | `is_lead` (S2) | **Low** |
| Podcasts | S1; public site has `/podcast/` page (content pending) | none | Low-medium |
| Corporate Relations | S2 only | `is_lead` | Low |
| Documentation | S2 only | `is_lead` | Low |
| Analytics | S4 only (as a role) | none | Low |
| Lead (overall) | S4 (Nimisha Sivakumar), NEC team leader | position, not a vertical | n/a: leadership position |
| *7th vertical* | S3 asserts it exists | — | **Unknown** |

## DECISION REQUIRED FROM E-CELL LEADERSHIP

Provide the **authoritative list of verticals for 2026–27**, as:

| Slug | Display name | One-line remit | Current head (name) |
|---|---|---|---|

and confirm whether "seven" on the public About page is correct. Until then:
- The public site copy stays as it is. It is institutional content, and changing it is not Technical's call.
- **Phase 1 is not blocked.** Verticals are rows, not code (see below), so implementation and tests use test fixtures. The production seed simply waits for the list.

## Data design (verticals are data)

```
Vertical(id, slug UNIQUE, name, description, display_order,
         is_active, archived_at, is_platform_custodian)
Membership(user, vertical, academic_year, title, status, joined_at, left_at)
RoleAssignment(user, role=VERTICAL_HEAD, scope=VERTICAL:<id>, academic_year,
               starts_at, ends_at, is_active)
LeadershipAssignment(user, position, vertical?, academic_year, predecessor_id, ...)
```

| Operation | How (no code change) | Audited as |
|---|---|---|
| Add vertical | Admin → Verticals → New (`vertical.manage`) | `vertical.create` |
| Rename / edit description | edit row. `slug` stays stable, so URLs and permissions don't break | `vertical.update` (before/after) |
| Assign head | create a scoped `RoleAssignment` (`vertical_head.assign`) | `role.assign` |
| Change leadership | succession workflow (doc 10) ends one assignment and starts the next | `succession.complete` |
| Remove vertical | **archive** (`is_active=false`, `archived_at`). History, events and KB stay attached. Hard delete only when there are zero references | `vertical.archive` |

Rules:
- There is no `enum` of verticals anywhere in code. Code may reference **only** the `is_platform_custodian` flag (to find Technical for platform notifications), never a name or slug.
- Archiving a vertical with active heads or open work needs a typed confirmation and a reassignment step.

## Related unresolved facts (informational)
- **Faculty names conflict.** The public site says "Dr. Venketalakshmi, Dr. Vijay Vardhan" (`team.data.ts`). Control Room migration `0001_init.sql` has a comment naming "Dr. Shripriya / Dr. Vijaykumar". Leadership should confirm which is current. This doesn't affect code.
- Leadership turnover month: the Control Room says leadership is handed on "each October". Unconfirmed.
