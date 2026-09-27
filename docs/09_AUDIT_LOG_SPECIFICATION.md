# 09 — Audit Log Specification

Append-only table `audit_auditlog`. Enforced at the application layer
(`AuditLog` raises `AppendOnlyError` on update/delete) and at the database
layer: migration `apps.audit.migrations.0002_append_only_trigger` adds
`BEFORE UPDATE`/`BEFORE DELETE`/`BEFORE TRUNCATE` triggers that reject the
write outright, including for the table's owning role (`REVOKE` alone
cannot do this — an owner keeps its implicit privileges regardless of
grants).

**Precisely what this guarantees, and what it does not:**
- Rejects any *ordinary* `UPDATE`, `DELETE` or `TRUNCATE` statement, from
  every database role including the table owner. Verified directly against
  PostgreSQL with raw SQL, not only through the Django ORM.
- Does **not** protect against the table's owning role issuing privileged
  DDL (`ALTER TABLE ... DISABLE TRIGGER`, `DROP TRIGGER`). PostgreSQL ties
  that ability to ownership, not to a revocable privilege, and this
  project's single `DATABASE_URL` role owns every table it migrates — so
  it can always disable or drop these triggers with its own credentials.
  Closing that gap would require a second, non-owning database role, which
  does not exist in this project.

A separate deployment-time `REVOKE UPDATE, DELETE, TRUNCATE`
(`backend/scripts/harden_audit_log.sql`) is optional defense in depth for
any role that is *not* the table owner; it has no effect on the owning
role, for the same reason. See `PHASE_1_IMPLEMENTATION_NOTES.md` §10 (F8).

| Field | Type | Notes |
|---|---|---|
| id | bigserial | |
| at | timestamptz | server time |
| actor_id / actor_email / actor_roles | FK / text / text[] | email+roles denormalised so history survives user changes |
| action | text, dotted | `role.assign`, `vertical.create`, `content.publish` … (same convention as Control Room `audit_log`, which migrates in directly) |
| target_type / target_id | text / text | |
| summary | text | human sentence, rendered in UI |
| before / after | jsonb | changed fields only; secrets/password hashes never logged |
| result | enum | SUCCESS, DENIED, ERROR |
| ip / user_agent / request_id | text | IP truncated to /24 after 90 days |

## Must be logged

Auth (login, failed login, logout, password reset, 2nd-factor failures),
user create/deactivate/reactivate, role/permission changes, vertical
create/rename/deactivate, head assignment, succession, academic-year switch,
every content workflow transition, publish/unpublish, deletion/archive of
anything, approval-rule changes, system settings, media deletion, **every
DENIED attempt on an admin endpoint** (privilege-escalation evidence).

## UI (`/platform/admin/audit`)

Filters: date range, actor, action prefix, target, result. Full-text on
summary. Paginated (cursor on `at,id`). CSV export. Visible to `audit.view`.

## Implementation

A single `audit.record(request, action, target, before, after, result)`
helper; service-layer functions call it inside the same DB transaction as
the change, so a change can't commit without its log row.
