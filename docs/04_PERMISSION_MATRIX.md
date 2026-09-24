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
