# ADR-010 — Super Admin Exemption from the "Grant Only What You Hold" Rule

- **Status:** ACCEPTED for implementation (Phase 1, 2026-09-25). **Needs ratification by the Technical Head and Super Admin.**
- **Found during:** Phase 1 implementation of `apps/rbac/services.py`
- **Kind:** resolves a contradiction between two accepted documents. It is not a redesign.

## The contradiction

Two accepted rules cannot both hold:

1. `03_RBAC_MODEL.md`, anti-escalation rule 1: *"A user can only grant permissions they themselves hold **globally**."*
2. `04_PERMISSION_MATRIX.md` deliberately withholds permissions from `SUPER_ADMIN`:
   - `content_type.manage`. Block types belong to Technical (principle 1).
   - `content.approve_faculty`. Faculty authority is separate from organizational authority (ADR record §E).

Applied literally, **nobody could ever assign** `TECHNICAL_HEAD`, `PLATFORM_ADMIN` (both carry
`content_type.manage`) or `FACULTY_ADVISOR` (carries `content.approve_faculty`). No one holds
those permissions until someone is assigned, and no one could be assigned. The only other ways
out would be giving Super Admin those permissions, which breaks the principle behind the matrix,
or bootstrapping them through the database, which is unaudited and exactly what the platform
exists to prevent.

## Decision

The subset rule (R1) applies to every actor **except** holders of `role.manage` at GLOBAL scope.
In the seeded roles that is only `SUPER_ADMIN`, whose defining authority is deciding who holds
which role (principle 3). Everything else still applies to Super Admins:

| Rule | Applies to Super Admin? |
|---|---|
| R1 grant ⊆ own permissions | **No** (this ADR) |
| R2 privileged roles need `role.manage` | Yes (they hold it) |
| R3 at least one `role.manage` holder must remain (409) | Yes |
| R4 nobody changes their own assignments (403) | Yes |
| R5 the role's `assign_permission` at the target scope | Yes |
| R6 every attempt audited, including DENIED | Yes |

Super Admins still do **not** hold `content_type.manage` or `content.approve_faculty`. They can
appoint the people who do, but cannot exercise those powers themselves. The matrix is unchanged.

## Consequences

- Test: `test_super_admin_can_grant_technical_roles`.
- Admin Heads remain bound by R1. They cannot assign `PLATFORM_ADMIN` or `FACULTY_ADVISOR` (tests: `test_admin_head_cannot_grant_permissions_they_lack`).
- If a future custom role is given `role.manage`, it inherits this exemption. Treat `role.manage` as the most sensitive permission in the catalogue.
