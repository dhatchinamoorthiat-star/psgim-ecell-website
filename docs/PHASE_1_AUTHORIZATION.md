# Phase 1 Authorization

- **Date:** 2026-09-25
- **Decision:** **GO** for Phase 1 *implementation* (Phase 1a backend foundation and Phase 1b platform shell, local development and tests).
- **Not authorized by this document:** any deployment of the backend, production data seeding, Supabase data migration, changes to Cloudflare production settings. Those have explicit gates below.

Phase 1 scope (from `19_IMPLEMENTATION_ROADMAP.md`): Django skeleton, custom User,
session auth + CSRF, forgot/reset, RBAC tables + policy engine + seeded
roles/permissions, Vertical, AcademicYear, Membership, AuditLog, escalation test
suite, Angular `/platform` shell with login and permission-aware nav, admin
screens for users/verticals/roles, CI.

---

## BLOCKING — must be decided before Phase 1 implementation

**None.** Every item that was blocking in the Phase 0 audit is now resolved:

| Former blocker | Resolution |
|---|---|
| ADR-001 fate of the Control Room | Option B, incremental and parity-gated (`ARCHITECTURE_DECISION_RECORD.md` §B) |
| ADR-008 backend host | Render paid + Neon, fallback Cloud Run (`ADR-008-BACKEND-HOSTING.md`) |
| Uncommitted `/blogs/` work | committed separately (`2e91ae7`) |
| Faculty approval question | made configurable (`07_CONTENT_WORKFLOW.md` ApprovalRule spec) |

---

## NON-BLOCKING — can be configured or decided later (with the gate each one blocks)

| ID | Item | Who decides | Exact answer needed | Gates |
|---|---|---|---|---|
| N-1 | **Hosting spend and account ownership.** About $7/month for Render production, and which **E-Cell-owned email / payment method** owns Render, Neon, Cloudflare, Cloudinary | Super Admin / faculty coordinator | "Approved: $__/month, paid by __, accounts owned by `<org email>`, second admin `<name>`" | first **staging/production deploy** (Phase 1b end) |
| N-2 | **Authoritative vertical list for 2026–27** (4 sources disagree; public site says seven, unnamed) | E-Cell leadership | table: slug, display name, one-line remit, current head. Plus: is "seven" on the About page correct? | **production seed** of verticals and heads |
| N-3 | **Initial ApprovalRule configuration.** Recommended: mirror the Control Room (faculty approval required for events only) | Super Admin + faculty coordinators | "Faculty approval required for: [content types / verticals / event kinds] or none" | first **CMS publish** (Phase 2) |
| N-4 | **Who holds `FACULTY_ADVISOR`**, and the faculty coordinators' current names (site says Dr. Venketalakshmi, Dr. Vijay Vardhan; Control Room comment says Dr. Shripriya / Dr. Vijaykumar) | Faculty coordinators | names + emails of current faculty advisors | faculty role assignment (Phase 2) |
| N-5 | **Initial Super Admin(s)**, at least 2 people so the "last super admin" rule never locks the org | Leadership | two names + emails | first production login |
| N-6 | **GitHub organization.** Move `psgim-ecell-website` and `E-Cell` repos off the personal account | Current repo owner + leadership | org name. Transfer done | CI setup (Phase 1b), strongly recommended before |
| N-7 | **Leadership turnover month** (Control Room says October) | Leadership | month | academic-year seeding / rollover (Phase 4) |
| N-8 | Custom domain (today only `psgim-ecell.pages.dev`) | Leadership + institute IT | domain or "stay on pages.dev" | nothing in Phase 1. Same-origin works either way |
| N-9 | Python-capable Technical member for 2027–28 onward (staffing risk from choosing Django) | Technical Head | name of successor or plan | Technical Head handover |

## INFORMATIONAL — does not affect implementation

| ID | Item |
|---|---|
| I-1 | Production deploys happened from uncommitted code. ADR-009 CI guardrail (clean-tree check) prevents it once CI exists |
| I-2 | `ng test` target is misconfigured (no spec files). Will be fixed when Phase 1 adds the first frontend tests |
| I-3 | `ecell/E-Cell-Control-Room.pdf` could not be text-extracted here. A human may want to check it for vertical/approval intent |
| I-4 | Control Room has uncommitted Cloudflare/OpenNext work in its own repo. Not touched. Its owner should commit or discard it |
| I-5 | Free-tier figures in ADR-008 were verified from vendor pages on 2026-09-25. Re-verify yearly |
| I-6 | Pages vs Workers Static Assets: staying on Pages (ADR-003). Re-check Cloudflare guidance in Phase 5 |
| I-7 | `/control/` QR tool remains publicly reachable by URL (harmless, noindex). It may move under `/platform` later |
| I-8 | Root README still says "the 10 routes" in its structure diagram (there are 18). Cosmetic |

---

## Gates summary

```
NOW ──► Phase 1 coding (local, tests, CI config)              ✅ GO
         │
         ├─ needs N-1 (+N-6 recommended) ─► first staging/production backend deploy
         ├─ needs N-2, N-5              ─► production seed (verticals, heads, super admins)
         ├─ needs N-3, N-4              ─► first CMS publish with approvals (Phase 2)
         └─ needs N-7                   ─► academic-year rollover (Phase 4)
```

Phase 1 still requires your explicit instruction to proceed.
