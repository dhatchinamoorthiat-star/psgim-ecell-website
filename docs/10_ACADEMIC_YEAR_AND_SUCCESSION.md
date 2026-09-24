# 10 — Academic Year & Succession

## Academic year

`AcademicYear(label, starts_on, ends_on, is_current)`. Memberships,
LeadershipAssignments, RoleAssignments and Events carry `academic_year`.
Queries enabled: "Events Head in 2026-27", "events run in 2026-27",
"successor of the 2026-27 Technical Head" (`predecessor_id` chain).

The Control Room notes leadership is "handed on each October" — **confirm the
actual turnover month** before seeding year boundaries.

## Succession workflow (`/platform/admin/succession`)

1. Super Admin / Admin Head selects position (e.g. Technical Head) and successor.
2. System shows the incumbent's pending items: open tasks, requests, drafts in review, owned events.
3. For each group choose: transfer to successor / reassign / leave.
4. Incumbent (optional) writes handover notes → stored + linked KB article.
5. Confirm (typed confirmation). In one transaction:
   - end incumbent's LeadershipAssignment + RoleAssignment (`ends_at=now`),
   - create successor's with `predecessor_id`,
   - reassign selected items,
   - AuditLog `succession.complete`, notify both.
6. Incumbent's account stays; status → `alumni` at year rollover if they have no remaining membership.

Nothing is deleted. Safety: Technical Head succession also triggers the
**infrastructure handover checklist** in `17_DEVELOPER_HANDOVER.md` §9
(Cloudflare, GitHub org, DB, Cloudinary, email owner transfer) — platform
roles do not transfer third-party account ownership by themselves.

## Year rollover

`academic_year.rollover` (Super Admin): create next year, optionally copy
vertical memberships as "pending confirmation", flip `is_current`. Past
years remain read-only.
