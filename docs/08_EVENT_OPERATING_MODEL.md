# 08 — Event Operating Model

An **Event** is an operational object with a public face, not a post.

```
Event (owner vertical: exactly one; contributors: many)
 ├─ Public content  → ContentItem (versioned, workflow, preview)
 ├─ Team            → EventParticipant
 ├─ Workstreams     → one per contributing vertical (seedable from a Blueprint)
 │    └─ Tasks → TaskAssignments
 ├─ Requests        → WorkRequest (from one vertical to another, scoped to the event)
 ├─ Speakers, Sponsors (reusable entities)
 ├─ Media           → MediaCollection (gallery, posters)
 ├─ Registration    → ported from Control Room (passes, attribution, offline check-in)
 ├─ Documents       → MediaAsset kind=document
 ├─ Timeline        → milestones
 ├─ Approvals
 └─ Post-event report (Control Room already generates one: /admin/events/[id]/report)
```

## Authority

- Owner vertical head: edits event core + public content (subject to approval rules), creates workstreams, invites contributors, sees all workstream status.
- Contributor vertical head: full control of **their** workstream and tasks; cannot edit the owner's core fields or other workstreams.
- Members: see the event workspace; update tasks assigned to them.

## Example: E-Summit 2027

| Vertical | Role | Workstream |
|---|---|---|
| Events | owner | planning, speakers |
| Technical | contributor | website, registration, QR check-in |
| Media | contributor | photography, video, creatives |
| Public Relations | contributor | outreach, press release |
| Operations | contributor | venue, logistics, hospitality |
| Podcasts | contributor | speaker podcast |

## Work requests

State machine: `REQUESTED → ACCEPTED → IN_PROGRESS → SUBMITTED → REVIEW →
COMPLETED` (+ `DECLINED`, `BLOCKED` with reason). Ported from the Control
Room `requests` / `request_events` tables, which already implement most of this.
The platform is the system of record; discussion stays in WhatsApp — each
request has a short comment log, not chat.

## Notifications (lightweight)

In-app list + optional daily email digest. Triggers listed in brief §22. No
real-time sockets in V1; the platform polls `/api/notifications/unread-count`
only on navigation, not on a timer.
