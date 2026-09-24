# 07 — Content Workflow

## States

```
DRAFT → SUBMITTED → IN_REVIEW → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED
                        │                       ▲
                        └→ CHANGES_REQUESTED ───┘ (back to DRAFT on edit)
```

State is on the **draft version's workflow**, independent of what is
published: an item can be PUBLISHED (v3 live) while v4 is IN_REVIEW.

## Transitions

| From → To | Who | Side effects |
|---|---|---|
| DRAFT → SUBMITTED | `content.submit` | notify reviewers per ApprovalRule |
| SUBMITTED → IN_REVIEW | reviewer opens | — |
| IN_REVIEW → CHANGES_REQUESTED | `content.review` | comment required; notify author |
| IN_REVIEW → APPROVED | `content.approve`, reviewer ≠ author | Approval row |
| APPROVED → SCHEDULED | `content.schedule` | `publish_at` > now (org timezone) |
| APPROVED/SCHEDULED → PUBLISHED | `content.publish` or tick | swap pointer, deploy hook, audit |
| PUBLISHED → ARCHIVED | `content.publish` | unpublish; `unpublish_at` does this automatically |
| any edit after APPROVED | — | new draft, workflow resets to DRAFT |

Every transition: AuditLog + Notification. Illegal transitions → HTTP 409.

## Approval rules (specification, decided 2026-09-25)

### Three kinds of authority, never conflated

| Kind | Question it answers | Granted by | Example permission |
|---|---|---|---|
| **Organizational approval** | "Is this what the E-Cell wants to say?" | Super Admin / Admin Head / (per rule) Vertical Head | `content.approve` |
| **Faculty approval** | "Does the institution sign off on this?" | a user holding the `FACULTY_ADVISOR` role | `content.approve_faculty` |
| **Technical/platform authorization** | "Is the system allowed to perform this operation?" | Technical Head / Platform Admin | `system.settings`, `content_type.manage` |

Technical roles hold **no** `content.approve*` permissions by default. Being
platform custodian never implies the authority to approve content (principle 1).

### Evidence on faculty approval
The Control Room *did* hard-code faculty approval for activities.
`ecell/supabase/migrations/0002_rls.sql` says: "An activity is publicly visible
only once faculty have approved it" and "Approval is faculty-only", enforced by
a trigger that raises `only faculty may approve or reject activities`. This shows
that faculty approval was the **previous design intent** for events. It is not a
confirmed current policy, and the public Angular site has never had any approval
step. So faculty approval becomes **configuration, not architecture**.

### ApprovalRule model

```
ApprovalRule(
  id, name, is_active, priority,
  -- match conditions (NULL = any)
  content_type,          -- event | blog | announcement | page | gallery | …
  owner_vertical_id,
  event_kind,            -- matches Event.kind (e.g. summit, talk) when content_type=event
  -- requirements
  stages: [              -- ordered, all must be satisfied
    { kind: ORGANIZATIONAL | FACULTY,
      permission: "content.approve" | "content.approve_faculty",
      scope: GLOBAL | OWNER_VERTICAL,
      min_approvers: int }
  ],
  created_by, updated_at
)
```

Resolution: collect every active rule whose conditions match the item. Required
stages are the **union** across them (the strictest wins; `min_approvers` takes
the max per stage kind). If no rule matches, the **default rule** applies: one
ORGANIZATIONAL stage with `content.approve` at GLOBAL scope, and 1 approver.

### Supported configurations (examples)

| Policy | Rules |
|---|---|
| No faculty approval (default) | default rule only |
| Faculty approval for selected content types | `{content_type: announcement, stages: [ORG, FACULTY]}` |
| Faculty approval for selected verticals | `{owner_vertical: <id>, stages: [ORG, FACULTY]}` |
| Faculty approval for selected event types | `{content_type: event, event_kind: summit, stages: [ORG, FACULTY]}` |
| Vertical Head may self-publish blogs within vertical | `{content_type: blog, owner_vertical: <id>, stages: [ORG scope=OWNER_VERTICAL]}` |

### Invariants (enforced server-side, tested)
1. **No self-approval.** An approver can never be the author of the version being approved, in any stage.
2. The same person can't satisfy two stages of one version. Organizational and faculty sign-offs are distinct people.
3. Approval binds to a **version**. Editing after approval creates a new draft and voids prior approvals.
4. ApprovalRule create/update/deactivate requires `approval_rule.manage` (Super Admin only) and is audited (`approval_rule.*`).
5. Rules are evaluated at *submit* time and stored on the submission, so changing a rule mid-review doesn't silently change what an in-flight item needs. An admin can explicitly re-evaluate it.

## Scheduling

`publish_at` / `unpublish_at` entered in Asia/Kolkata, stored UTC. Tick runs
every 5 minutes → worst-case latency 5 min + build time. Tick is idempotent
(select `state=SCHEDULED AND publish_at <= now() FOR UPDATE SKIP LOCKED`).

## Revision history & rollback

Every save = new ContentVersion. UI shows a field-level diff between any two
versions. Rollback = copy an old version into a new draft (history is never
rewritten), then normal workflow.
