# 03 — RBAC Model

## Principle

`User → RoleAssignment(role, scope) → Role → Permissions`. Role is **never**
a vertical. The backend policy engine is the only authority; Angular only
hides UI it predicts will be denied.

## Entities

- **Permission** — code string, e.g. `event.edit`. Defined in `backend/apps/rbac/catalogue.py` and written to the database by `python manage.py seed_rbac`; not editable in the UI or API (Technical adds them in code, because code must enforce them).
- **Role** — named bundle of permissions (`RolePermission`, each with an `own_only` flag). **Seven system roles** (seeded by `seed_rbac`, `is_system=True`, read-only through the API):
  1. `SUPER_ADMIN` 2. `ADMIN_HEAD` 3. `TECHNICAL_HEAD` 4. `PLATFORM_ADMIN` 5. `VERTICAL_HEAD` 6. `MEMBER` 7. `FACULTY_ADVISOR`.
  `is_privileged=True` for `SUPER_ADMIN`, `ADMIN_HEAD`, `TECHNICAL_HEAD` only.
  `global_only=True` for `FACULTY_ADVISOR` only.
  - `PLATFORM_ADMIN` is **non-privileged**: a technical support/custodial role, not an organisational governance role. Its permissions are those in the permission matrix; R7 and R7a do not apply, so it may be vertical-scoped, year-bound or end-dated (ratified 2026-09-25).
  - `FACULTY_ADVISOR` is **non-privileged** and **organisation-wide only** (R7a). It holds faculty approval authority, not organisational governance authority. It may be limited to an academic year and/or an end date. Who holds it is governed by N-4 (ratified 2026-09-25). Each role stores the permission needed to assign it (`assign_permission`: `vertical_head.assign` for `VERTICAL_HEAD`, `role.assign` otherwise). Custom roles are **not implemented** in Phase 1 (planned; would need `role.manage`).
- **RoleAssignment** — `(user, role, scope_type, scope_id, academic_year, starts_at, ends_at, assigned_by, revoked_at, revoked_by)`.
  `scope_type ∈ {GLOBAL, VERTICAL, EVENT, PROJECT}` (EVENT/PROJECT accepted by the model, used from Phase 2–3). An assignment is *in force* when not revoked, within `starts_at`/`ends_at`, and its academic year (if any) is current. Assignments are revoked, never deleted.

Example: Events Head = `RoleAssignment(user=A, role=VERTICAL_HEAD, scope=VERTICAL:events, year=2026-27)`.

## Scope resolution

`has_perm(user, perm, obj)` is true if any active assignment grants `perm` and:

| Assignment scope | Matches obj when |
|---|---|
| GLOBAL | always |
| VERTICAL v | `obj.owner_vertical == v`, or obj is v itself, or (for contributor-scoped perms) v ∈ `obj.contributing_verticals` |
| EVENT e | obj is e or belongs to e |
| PROJECT p | obj is p or belongs to p |
| OWN (a restriction, not a scope) | the role's permission has `own_only=True` **and** `obj.rbac_owner_id() == user.id` |

Targets implement `rbac_scopes()` (the set of `(scope_type, id)` they belong to) and optionally
`rbac_owner_id()`. An object-less check (`has_perm(user, perm)`) means *organisation-wide*: only
GLOBAL, non-own grants satisfy it. List endpoints filter with `scopes_for(user, perm)`.

Implemented once in `backend/apps/rbac/policy.py`. Every API view subclasses
`PermissionedAPIView` (`backend/apps/rbac/api.py`) and declares `required_perms` per HTTP method;
the `DeclaredPermission` class applies it as a coarse gate (the user holds the permission in some
scope), and the view then calls `self.require(perm, obj)` or the RBAC services for the scoped
decision. A test fails if any view lacks a declaration, and another if application code compares
role names. No `if role == ...` anywhere.

## Anti-escalation rules (enforced server-side, tested)

Implemented in `backend/apps/rbac/services.py` (R1–R7, R7a) and the user views.

1. **R1** A user can only grant a role whose permissions they themselves hold at a scope covering the target. **Exception (ADR-010):** holders of `role.manage` at GLOBAL scope (Super Admin) may grant roles whose permissions they do not hold; they do not thereby gain those permissions.
2. **R2** Privileged roles (`is_privileged`: `SUPER_ADMIN`, `ADMIN_HEAD`, `TECHNICAL_HEAD`) can be granted or revoked only by a holder of `role.manage` (Super Admin) (mirrors the Control Room's `guard_role_change()`). Accounts holding a privileged role can likewise only be edited/deactivated by a `role.manage` holder.
3. **R3** At least one active user must always hold `role.manage` globally. Revoking, deactivating or switching the academic year in a way that would leave none is refused with **409**. These operations take a shared database lock (`lock_governance()`) and re-check inside their transaction, so concurrent operations cannot jointly remove the last governor.
4. **R4** Nobody edits their own role assignments or deactivates themselves (403).
5. **R5** Assigning needs the role's `assign_permission` at the target scope, so vertical-scoped heads cannot create GLOBAL assignments.
6. **R6** Every attempt writes an `AuditLog` entry, including refused mutations (`result=DENIED`).
7. **R7** Privileged roles (`is_privileged`) are assigned only at GLOBAL scope, with no academic year and no end date (400 otherwise), so governance cannot lapse through a year switch or the passage of time. Handover is an explicit revoke. *(Unchanged by R7a.)*
8. **R7a** Organisation-wide roles (`global_only`, currently only `FACULTY_ADVISOR`) are assigned only at GLOBAL scope (400 otherwise). Unlike R7, academic-year and end-date limits **are** allowed. Checked after authorization, like R7, so unauthorised callers get 403 and learn nothing about the constraint.

There is no R8: a separation-of-duties rule was considered and not adopted (ADR-010, Option A).

## Mapping from the Control Room enum

| Control Room `app_role` | Target |
|---|---|
| public | no role (participant / registrant) |
| member | MEMBER @ VERTICAL (from `team_members`) |
| core | MEMBER, or VERTICAL_HEAD where `team_members.is_lead` |
| faculty | system role `FACULTY_ADVISOR` (`content.approve_faculty` + view). Whether its approval is *required* is ApprovalRule config (doc 07) |
| admin | ADMIN_HEAD @ GLOBAL |
| super_admin | SUPER_ADMIN @ GLOBAL |

The Control Room's second-factor PIN for all non-public roles should be
carried over (Phase 1b), since it is already the team's accepted practice.
