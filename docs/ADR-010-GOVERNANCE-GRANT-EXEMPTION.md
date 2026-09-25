# ADR-010 — Super Admin Exemption from the "Grant Only What You Hold" Rule

- **Status:** IMPLEMENTED (Phase 1, 2026-09-25). **NOT YET RATIFIED — requires a human governance decision (see "Ratification decision" below).**
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
| R3 at least one `role.manage` holder must remain (409), now also across academic-year switches and concurrent deactivations | Yes |
| R4 nobody changes their own assignments (403) | Yes |
| R5 the role's `assign_permission` at the target scope | Yes |
| R6 every attempt audited, including DENIED | Yes |
| R7 privileged roles only GLOBAL, no academic year, no end date (400) | Yes |

Super Admins still do **not** hold `content_type.manage` or `content.approve_faculty`. They can
appoint the people who do, but cannot exercise those powers themselves. The matrix is unchanged.

## Consequences

- Test: `test_super_admin_can_grant_technical_roles`.
- Admin Heads remain bound by R1. They cannot assign `PLATFORM_ADMIN` or `FACULTY_ADVISOR` (tests: `test_admin_head_cannot_grant_permissions_they_lack`).
- If a future custom role is given `role.manage`, it inherits this exemption. Treat `role.manage` as the most sensitive permission in the catalogue.

## Residual governance risk (found in the Phase 1 review, 2026-09-25)

The technical RBAC system does **not** fully prevent concentration of authority, and this ADR
should not be read as claiming it does.

- A Super Admin may appoint *another* account to a separated role (`TECHNICAL_HEAD`,
  `PLATFORM_ADMIN`, `FACULTY_ADVISOR`). That is the purpose of this ADR.
- Two Super Admins can appoint each other to those roles (R4 only blocks *self*-assignment).
  Verified in review: Super Admin B granting Super Admin A `FACULTY_ADVISOR` succeeds, after which A
  holds `content.approve_faculty`.
- A single Super Admin can create a second account (`user.manage`), make it a Super Admin
  (`role.manage`), and have that account appoint the first to any role.
- The platform identifies **accounts**, not humans. Nothing technical prevents one person from
  controlling several accounts or holding several roles.

What *does* hold: no account can grant itself anything (R4); every grant and revoke is audited
with the actor's roles at the time (R6); governance can't be emptied (R3/R7); approvals are
person-based at the account level (no self-approval, distinct approver per stage). The residual
risk is therefore **detectable** through the audit log but not **prevented**.

Mitigations that are organisational rather than technical: at least two Super Admins from
different parts of the organisation (N-5); periodic review of privileged grants in the audit log
by faculty coordinators; account issuance tied to institutional email.

## Ratification decision (open — requires human input)

The mechanism above stays as implemented. What needs deciding is how to treat the residual risk:

- **(a)** Accept it, relying on audit visibility plus organisational controls (two or more Super Admins, periodic review).
- **(b)** Additionally enforce a separation-of-duties rule, e.g. an account holding `SUPER_ADMIN` may not also hold `FACULTY_ADVISOR` (and/or `TECHNICAL_HEAD`). This is a new governance rule and has **not** been implemented.

Neither has been chosen. ADR-010 remains unratified until the Super Admin / faculty coordinators
record a decision here, with a date.
