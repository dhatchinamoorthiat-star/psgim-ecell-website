# 03 — RBAC Model

## Principle

`User → RoleAssignment(role, scope) → Role → Permissions`. Role is **never**
a vertical. The backend policy engine is the only authority; Angular only
hides UI it predicts will be denied.

## Entities

- **Permission** — code string, e.g. `event.edit`. Seeded by migration, not editable in UI (Technical adds them in code, because code must enforce them).
- **Role** — named bundle of permissions. System roles (seeded, `is_system=True`, cannot be deleted): `SUPER_ADMIN`, `ADMIN_HEAD`, `TECHNICAL_HEAD`, `PLATFORM_ADMIN`, `VERTICAL_HEAD`, `MEMBER`. Super Admin may create custom roles from existing permissions.
- **RoleAssignment** — `(user, role, scope_type, scope_id, academic_year, starts_at, ends_at, is_active)`.
  `scope_type ∈ {GLOBAL, VERTICAL, EVENT, PROJECT}`.

Example: Events Head = `RoleAssignment(user=A, role=VERTICAL_HEAD, scope=VERTICAL:events, year=2026-27)`.

## Scope resolution

`has_perm(user, perm, obj)` is true if any active assignment grants `perm` and:

| Assignment scope | Matches obj when |
|---|---|
| GLOBAL | always |
| VERTICAL v | `obj.owner_vertical == v`, or obj is v itself, or (for contributor-scoped perms) v ∈ `obj.contributing_verticals` |
| EVENT e | obj is e or belongs to e |
| PROJECT p | obj is p or belongs to p |
| (implicit OWN) | `obj.created_by == user` for perms suffixed `.own` |

Implemented once in `rbac/policy.py`, used by a DRF permission class
`HasPerm("event.edit")` on every view. No `if role == ...` anywhere.

## Anti-escalation rules (enforced server-side, tested)

1. A user can only grant permissions they themselves hold **globally**.
2. Only `SUPER_ADMIN` may grant/revoke `SUPER_ADMIN`, `ADMIN_HEAD`, `TECHNICAL_HEAD` (mirrors the Control Room's `guard_role_change()`).
3. At least one active `SUPER_ADMIN` must always exist (cannot remove the last).
4. Nobody edits their own role assignments.
5. Vertical-scoped heads cannot create GLOBAL-scoped assignments.
6. All of the above write an `AuditLog` entry, including denied attempts (`result=DENIED`).

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
