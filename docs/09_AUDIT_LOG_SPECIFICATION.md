# 09 — Audit Log Specification

Append-only table `audit_auditlog`. The application DB user has no
UPDATE/DELETE grant on it (enforced by a migration that revokes them).

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
