# 05 — Data Model (proposed)

PostgreSQL via Django ORM. All tables: `id` (UUID), `created_at`,
`updated_at`, `created_by`. "Deletion" of organisational records is
`is_active=False` / `archived_at` unless noted. `⇐ CR:x` = derived from
Control Room table `x` (migrate data from it).

## Identity & organisation

| Entity | Key fields | Notes |
|---|---|---|
| User ⇐ CR:profiles | email (unique), full_name, phone, photo (MediaAsset), status {active, inactive, alumni}, email_verified_at | Django custom user from day 1 |
| Organization | name, timezone=`Asia/Kolkata`, settings JSON | single row |
| AcademicYear ⇐ CR:academic_years | label `2026-27`, starts_on, ends_on, is_current (one true, DB constraint) | |
| Vertical ⇐ CR:teams | slug, name, description, display_order, is_active, is_platform_custodian (Technical) | DB rows, never code constants |
| Membership ⇐ CR:team_members | user, vertical, academic_year, title, status, joined_at, left_at | user may hold many |
| Role, Permission, RoleAssignment | see `03_RBAC_MODEL.md` | |
| LeadershipAssignment ⇐ CR:committee_members | user, position, vertical?, academic_year, starts_at, ends_at, predecessor_id, handover_notes | historical record; see doc 10 |

## CMS

| Entity | Key fields |
|---|---|
| ContentItem | type {page_section, blog, announcement, initiative, gallery_album, team_profile, site_setting}, slug, owner_vertical, state (see doc 07), `published_version_id`, `draft_version_id`, publish_at, unpublish_at, is_verified (replaces `pending`) |
| ContentVersion | content_item, number, data JSONB (validated by the type's schema), blocks JSONB, author, created_at, change_note |
| ContentBlockType | key (`hero`, `rich_text`, `faq`, …), JSON schema, version — owned by Technical |
| Approval | target (generic FK), version, requested_by, reviewer, decision {approved, changes_requested}, comment |
| ApprovalRule | content_type, owner_vertical?, required_permission, min_approvers |
| Blog | 1:1 extension of ContentItem: author, author_vertical, cover, excerpt, category, tags M2M, seo_title, seo_description, og_image |

## Events & operations

| Entity | Key fields |
|---|---|
| Event ⇐ CR:activities | slug, title, kind, owner_vertical, content_item (public face, versioned), starts_at, ends_at, venue, academic_year, registration config, status {planning, live, completed, archived}, post_event_report |
| EventVertical | event, vertical, role {owner, contributor} (exactly one owner, DB constraint) |
| EventParticipant | event, user, role_in_event |
| Speaker ⇐ CR:speakers | name, designation, organization, photo, bio, links JSON; M2M Event via EventSpeaker(order, session) |
| Sponsor ⇐ CR:activity_partners/organisations | name, logo, url, tier; M2M Event |
| Registration ⇐ CR:registrations/participants | event, participant, pass_code, status, check-in fields — port the attribution + offline check-in logic as-is |
| Project | title, owner_vertical, event?, status, dates |
| Workstream ⇐ CR:blueprints (templates) | project or event, vertical, lead, title |
| Task ⇐ CR:blueprint_tasks | workstream, title, detail, status {todo, doing, blocked, done}, due_on, priority |
| TaskAssignment | task, user |
| WorkRequest ⇐ CR:requests + request_events | from_vertical, to_vertical, event?, title, detail, priority, due_on, state {requested, accepted, in_progress, submitted, review, completed, declined}, assignee, attachments; RequestEvent history |

## Supporting

| Entity | Key fields |
|---|---|
| MediaAsset ⇐ CR:media_assets | provider=`cloudinary`, public_id, kind, format, bytes, width, height, alt_text (required for images before publish), caption, tags, owner_vertical, uploaded_by |
| MediaCollection | e.g. event gallery; ordered M2M MediaAsset, cover_asset |
| KnowledgeArticle | vertical, title, slug, body (markdown), category {sop, guide, template, checklist, report, onboarding}, attachments, visibility {vertical, all_members}, versions (reuse ContentVersion pattern) |
| Notification ⇐ CR:notifications | user, kind, target (generic FK), read_at, emailed_at |
| AuditLog ⇐ CR:audit_log | see doc 09 — append-only |
| JobRun ⇐ CR:job_runs | job name, started/finished, result |

## Key indexes

`ContentItem(state, publish_at)`, `Event(starts_at)`, `Task(status, due_on)`,
`RoleAssignment(user, is_active)`, `AuditLog(at DESC)`, `AuditLog(actor, at)`,
`AuditLog(target_type, target_id)`, `Membership(academic_year, vertical)`.
