# 04 — Permission Matrix (seed defaults)

G = global, V = own vertical, C = as contributing vertical, E = assigned event,
O = own items only, — = none. Super Admin may edit custom roles; system role
defaults change only via migration.

| Permission | SUPER_ADMIN | ADMIN_HEAD | TECH_HEAD | PLATFORM_ADMIN | VERTICAL_HEAD | MEMBER |
|---|---|---|---|---|---|---|
| user.manage | G | G (non-privileged) | — | — | — | — |
| role.manage / permission.view | G | — | — | — | — | — |
| role.assign | G | G (≤ VERTICAL_HEAD) | — | — | — | — |
| vertical.manage | G | — | — | — | — | — |
| vertical_head.assign | G | G | — | — | — | — |
| academic_year.manage / succession.run | G | G | — | — | — | — |
| system.settings | G | — | G | G | — | — |
| audit.view | G | — | G (technical events) | — | — | — |
| event.create | G | G | — | — | V | — |
| event.edit | G | G | — | — | V | E |
| event.delete (archive) | G | G | — | — | V | — |
| speaker.manage | G | G | — | — | V | — |
| event_media.manage | G | G | — | — | V, C | E |
| blog.create / blog.edit | G | G | — | — | V | O |
| content.submit | G | G | — | — | V | O |
| content.review / content.approve | G | G | — | — | V | — |
| content.approve_faculty | — | — | — | — | — | — (held only by FACULTY_ADVISOR, G) |
| approval_rule.manage | G | — | — | — | — | — |
| content.publish / content.schedule | G | G | — | — | V¹ | — |
| gallery.manage / team_content.manage | G | G | — | — | V | — |
| media.upload | G | G | G | G | V | O |
| media.delete | G | G | G | — | V | O |
| project.create / workstream.create | G | G | — | — | V | — |
| task.assign | G | G | — | — | V, C | — |
| task.update | G | G | — | — | V | O (assigned) |
| request.create | G | G | G | — | V | — |
| request.respond | G | G | G | — | V (as recipient) | O (assigned) |
| event_workspace.manage | G | G | — | — | V (owner) | — |
| kb.edit | G | G | G | — | V | — |
| kb.view | G | G | G | G | G | G |
| analytics.view | G | G | G | — | V | — |
| content_type.manage (block types) | — | — | G | G | — | — |

¹ Whether a Vertical Head can publish without a second approver, and whether
faculty approval is needed, is set by **ApprovalRule** configuration
(`07_CONTENT_WORKFLOW.md`, "Approval rules"). Default: one organizational
approval by ADMIN_HEAD or SUPER_ADMIN, never the author.

`FACULTY_ADVISOR` is a system role holding `content.approve_faculty`,
`content.view`, `analytics.view` and `event.view` at GLOBAL scope. Whether
anyone holds it is an organizational decision.

Technical deliberately has **no** default content-edit permissions for other
verticals (brief §06).

---

## Phase 1 addendum (2026-09-25) — what the implementation actually seeds

The source of truth for seeded roles is now `backend/apps/rbac/catalogue.py`
(written to the database by `python manage.py seed_rbac`). It follows the
matrix above with these recorded additions and interpretations:

**Permissions added.** The admin screens needed read and membership permissions
the matrix did not list:

| Permission | SUPER_ADMIN | ADMIN_HEAD | TECH_HEAD | PLATFORM_ADMIN | VERTICAL_HEAD | MEMBER |
|---|---|---|---|---|---|---|
| user.view | G | G | G | — | V (members of own vertical, current year) | — |
| role.view | G | G | — | — | V | — |
| vertical.view | G | G | G | G | V | V |
| membership.view | G | G | — | — | V | — |
| membership.manage | G | G | — | — | V | — |
| event.view / content.view | G | G | — | — | V | — |

**FACULTY_ADVISOR** (seventh system role; not a column above; assigned GLOBAL; assigned to nobody until N-4):

| Permission | FACULTY_ADVISOR |
|---|---|
| content.approve_faculty | G |
| content.view | G |
| event.view | G |
| analytics.view | G |
| everything else | — |

`membership.manage` for Vertical Heads implements brief §54 (a head manages
their vertical's members) and success criterion 13 (members added without a
developer).

**Interpretations.**
- G/V/C/E columns do not live on the role; the *assignment's* scope decides where a permission applies. A Vertical Head is `VERTICAL_HEAD` assigned with `scope=VERTICAL:<id>`.
- "O" means `RolePermission.own_only = true`: the permission only covers objects whose `rbac_owner_id()` is the user.
- "E" in the MEMBER column (event.edit, event_media.manage) is **not** in the MEMBER role. It will be granted by EVENT-scoped assignments in Phase 3.
- `kb.view` is marked **G** for VERTICAL_HEAD and MEMBER in the table above, but both roles are assigned with VERTICAL scope, so in the implementation it is **effectively V** for them. Organisation-wide KB reading for heads and members needs a decision when the KB lands (Phase 4); nothing in Phase 1 enforces `kb.view`.
- Technical Head's `audit.view` is currently the whole log. The matrix says "technical events"; filtering is deferred (see implementation notes).
- `role.manage` holders are exempt from the grant-subset rule (**ADR-010**).
- Privileged roles (SUPER_ADMIN, ADMIN_HEAD, TECHNICAL_HEAD) are only ever assigned GLOBAL, without an academic year or end date (rule R7 in doc 03).
- Assigning `VERTICAL_HEAD` requires `vertical_head.assign`. Every other role requires `role.assign` (stored as `Role.assign_permission`).
