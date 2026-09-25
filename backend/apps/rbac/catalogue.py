"""
The permission catalogue and the system roles.

Source of truth: docs/04_PERMISSION_MATRIX.md. Rows there that combine two
permissions ("blog.create / blog.edit") are split into separate codes here.
Permissions marked `# Phase 1 addendum` were missing from the matrix and are
recorded in the matrix's addendum section — they are read/membership
permissions that the Phase 1 admin screens need.

Roles bundle permissions; the *scope* (global / a vertical / an event) comes
from the RoleAssignment, not from the role. Columns in the matrix map as:
  G / V / C / E -> the permission is in the role (the assignment's scope decides where)
  O             -> the permission is in the role with own_only=True
  E (for MEMBER) -> left out: granted later via EVENT-scoped assignments (Phase 3)

`python manage.py seed_rbac` writes this into the database. It is idempotent
and safe to re-run; it never assigns roles to people.
"""

# --- Permission codes -----------------------------------------------------
# Organisation & governance
USER_VIEW = "user.view"  # Phase 1 addendum
USER_MANAGE = "user.manage"
ROLE_VIEW = "role.view"  # Phase 1 addendum
ROLE_MANAGE = "role.manage"
PERMISSION_VIEW = "permission.view"
ROLE_ASSIGN = "role.assign"
VERTICAL_VIEW = "vertical.view"  # Phase 1 addendum
VERTICAL_MANAGE = "vertical.manage"
VERTICAL_HEAD_ASSIGN = "vertical_head.assign"
MEMBERSHIP_VIEW = "membership.view"  # Phase 1 addendum
MEMBERSHIP_MANAGE = "membership.manage"  # Phase 1 addendum
ACADEMIC_YEAR_MANAGE = "academic_year.manage"
SUCCESSION_RUN = "succession.run"
SYSTEM_SETTINGS = "system.settings"
AUDIT_VIEW = "audit.view"
APPROVAL_RULE_MANAGE = "approval_rule.manage"
# Events & content (enforced from Phase 2 onward; catalogued now so roles are complete)
EVENT_VIEW = "event.view"
EVENT_CREATE = "event.create"
EVENT_EDIT = "event.edit"
EVENT_DELETE = "event.delete"
SPEAKER_MANAGE = "speaker.manage"
EVENT_MEDIA_MANAGE = "event_media.manage"
BLOG_CREATE = "blog.create"
BLOG_EDIT = "blog.edit"
CONTENT_VIEW = "content.view"
CONTENT_SUBMIT = "content.submit"
CONTENT_REVIEW = "content.review"
CONTENT_APPROVE = "content.approve"
CONTENT_APPROVE_FACULTY = "content.approve_faculty"
CONTENT_PUBLISH = "content.publish"
CONTENT_SCHEDULE = "content.schedule"
GALLERY_MANAGE = "gallery.manage"
TEAM_CONTENT_MANAGE = "team_content.manage"
MEDIA_UPLOAD = "media.upload"
MEDIA_DELETE = "media.delete"
CONTENT_TYPE_MANAGE = "content_type.manage"
# Operations
PROJECT_CREATE = "project.create"
WORKSTREAM_CREATE = "workstream.create"
TASK_ASSIGN = "task.assign"
TASK_UPDATE = "task.update"
REQUEST_CREATE = "request.create"
REQUEST_RESPOND = "request.respond"
EVENT_WORKSPACE_MANAGE = "event_workspace.manage"
KB_EDIT = "kb.edit"
KB_VIEW = "kb.view"
ANALYTICS_VIEW = "analytics.view"

PERMISSIONS: dict[str, str] = {
    USER_VIEW: "See user accounts (within scope)",
    USER_MANAGE: "Create, edit, deactivate and reactivate user accounts",
    ROLE_VIEW: "See roles and role assignments (within scope)",
    ROLE_MANAGE: "Manage roles; grant or revoke privileged roles",
    PERMISSION_VIEW: "See the permission catalogue",
    ROLE_ASSIGN: "Assign and revoke non-privileged roles",
    VERTICAL_VIEW: "See verticals",
    VERTICAL_MANAGE: "Create, edit and archive verticals",
    VERTICAL_HEAD_ASSIGN: "Assign and revoke vertical heads",
    MEMBERSHIP_VIEW: "See vertical memberships (within scope)",
    MEMBERSHIP_MANAGE: "Add members to and end memberships of a vertical",
    ACADEMIC_YEAR_MANAGE: "Create academic years and set the current year",
    SUCCESSION_RUN: "Run the leadership succession workflow",
    SYSTEM_SETTINGS: "Change organisation/system settings",
    AUDIT_VIEW: "Read the audit log",
    APPROVAL_RULE_MANAGE: "Configure content approval rules",
    EVENT_VIEW: "See events (including unpublished)",
    EVENT_CREATE: "Create events",
    EVENT_EDIT: "Edit events",
    EVENT_DELETE: "Archive events",
    SPEAKER_MANAGE: "Manage speakers",
    EVENT_MEDIA_MANAGE: "Manage event media",
    BLOG_CREATE: "Create blog posts",
    BLOG_EDIT: "Edit blog posts",
    CONTENT_VIEW: "See unpublished content and drafts",
    CONTENT_SUBMIT: "Submit content for review",
    CONTENT_REVIEW: "Review submitted content",
    CONTENT_APPROVE: "Give organisational approval to content",
    CONTENT_APPROVE_FACULTY: "Give faculty approval to content",
    CONTENT_PUBLISH: "Publish and unpublish content",
    CONTENT_SCHEDULE: "Schedule content publication",
    GALLERY_MANAGE: "Manage galleries",
    TEAM_CONTENT_MANAGE: "Manage public team profiles",
    MEDIA_UPLOAD: "Upload media",
    MEDIA_DELETE: "Delete media",
    CONTENT_TYPE_MANAGE: "Manage CMS block/content types",
    PROJECT_CREATE: "Create projects",
    WORKSTREAM_CREATE: "Create workstreams",
    TASK_ASSIGN: "Assign tasks",
    TASK_UPDATE: "Update tasks",
    REQUEST_CREATE: "Create work requests",
    REQUEST_RESPOND: "Respond to work requests",
    EVENT_WORKSPACE_MANAGE: "Manage an event workspace",
    KB_EDIT: "Edit knowledge-base articles",
    KB_VIEW: "Read the knowledge base",
    ANALYTICS_VIEW: "See analytics",
}

# --- System roles ---------------------------------------------------------
# Each entry: permissions (full) and own_only permissions.

_CONTENT_AND_OPS = [
    EVENT_VIEW, EVENT_CREATE, EVENT_EDIT, EVENT_DELETE, SPEAKER_MANAGE, EVENT_MEDIA_MANAGE,
    BLOG_CREATE, BLOG_EDIT, CONTENT_VIEW, CONTENT_SUBMIT, CONTENT_REVIEW, CONTENT_APPROVE,
    CONTENT_PUBLISH, CONTENT_SCHEDULE, GALLERY_MANAGE, TEAM_CONTENT_MANAGE, MEDIA_UPLOAD, MEDIA_DELETE,
    PROJECT_CREATE, WORKSTREAM_CREATE, TASK_ASSIGN, TASK_UPDATE, REQUEST_CREATE, REQUEST_RESPOND,
    EVENT_WORKSPACE_MANAGE, KB_EDIT, KB_VIEW, ANALYTICS_VIEW,
]  # fmt: skip

SYSTEM_ROLES: dict[str, dict] = {
    "SUPER_ADMIN": {
        "name": "Super Admin",
        "description": "Organisation-wide governance: people, roles, verticals, years, audit.",
        "is_privileged": True,
        "permissions": [
            USER_VIEW,
            USER_MANAGE,
            ROLE_VIEW,
            ROLE_MANAGE,
            PERMISSION_VIEW,
            ROLE_ASSIGN,
            VERTICAL_VIEW,
            VERTICAL_MANAGE,
            VERTICAL_HEAD_ASSIGN,
            MEMBERSHIP_VIEW,
            MEMBERSHIP_MANAGE,
            ACADEMIC_YEAR_MANAGE,
            SUCCESSION_RUN,
            SYSTEM_SETTINGS,
            AUDIT_VIEW,
            APPROVAL_RULE_MANAGE,
            *_CONTENT_AND_OPS,
        ],  # fmt: skip
        "own_only": [],
    },
    "ADMIN_HEAD": {
        "name": "Admin Head",
        "description": "Cross-vertical organisational management, within the permissions granted.",
        "is_privileged": True,
        "permissions": [
            USER_VIEW,
            USER_MANAGE,
            ROLE_VIEW,
            ROLE_ASSIGN,
            VERTICAL_VIEW,
            VERTICAL_HEAD_ASSIGN,
            MEMBERSHIP_VIEW,
            MEMBERSHIP_MANAGE,
            ACADEMIC_YEAR_MANAGE,
            SUCCESSION_RUN,
            *_CONTENT_AND_OPS,
        ],  # fmt: skip
        "own_only": [],
    },
    "TECHNICAL_HEAD": {
        "name": "Technical Head",
        "description": "Platform custodian: infrastructure, settings, block types. No organisational approval authority.",
        "is_privileged": True,
        "permissions": [
            USER_VIEW,
            VERTICAL_VIEW,
            SYSTEM_SETTINGS,
            AUDIT_VIEW,
            MEDIA_UPLOAD,
            MEDIA_DELETE,
            REQUEST_CREATE,
            REQUEST_RESPOND,
            KB_EDIT,
            KB_VIEW,
            ANALYTICS_VIEW,
            CONTENT_TYPE_MANAGE,
        ],  # fmt: skip
        "own_only": [],
    },
    "PLATFORM_ADMIN": {
        "name": "Platform Admin",
        "description": "Technical support role: settings and block types.",
        "is_privileged": False,
        "permissions": [VERTICAL_VIEW, SYSTEM_SETTINGS, MEDIA_UPLOAD, KB_VIEW, CONTENT_TYPE_MANAGE],
        "own_only": [],
    },
    "VERTICAL_HEAD": {
        "name": "Vertical Head",
        "description": "Runs one vertical's work and content. Assign with VERTICAL scope.",
        "is_privileged": False,
        "assign_permission": VERTICAL_HEAD_ASSIGN,
        "permissions": [USER_VIEW, VERTICAL_VIEW, MEMBERSHIP_VIEW, MEMBERSHIP_MANAGE, ROLE_VIEW, *_CONTENT_AND_OPS],
        "own_only": [],
    },
    "MEMBER": {
        "name": "Member",
        "description": "Executes assigned work. Assign with VERTICAL scope.",
        "is_privileged": False,
        "permissions": [VERTICAL_VIEW, KB_VIEW],
        "own_only": [BLOG_CREATE, BLOG_EDIT, CONTENT_SUBMIT, MEDIA_UPLOAD, MEDIA_DELETE, TASK_UPDATE, REQUEST_RESPOND],
    },
    "FACULTY_ADVISOR": {
        "name": "Faculty Advisor",
        "description": "Faculty approval where an ApprovalRule requires it. Whether anyone holds this is an organisational decision (N-4).",
        "is_privileged": False,
        # Organisation-wide only (R7a); may still be limited to an academic year or end date.
        "global_only": True,
        "permissions": [CONTENT_APPROVE_FACULTY, CONTENT_VIEW, EVENT_VIEW, ANALYTICS_VIEW],
        "own_only": [],
    },
}
