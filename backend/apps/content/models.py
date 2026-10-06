"""
CMS content models (docs/05_DATA_MODEL.md "CMS", docs/20_CMS_CONTENT_MODEL.md,
docs/ADR-011-CMS-CONTENT-MODEL.md, docs/07_CONTENT_WORKFLOW.md).

`ContentItem`/`ContentVersion` are the generic base (slug, owner, workflow
state, version history). Type-specific structured fields live on a typed
one-to-one detail model per ADR-011 Option B (`PageDetail`, `InitiativeDetail`,
`NECDetail`, `BlogDetail`, `EventDetail`) rather than an untyped JSON blob —
only the visual page *layout* (`ContentVersion.blocks`) is JSON, because that
is inherently a tree of interchangeable, schema-validated components, not
structured metadata.

State transitions are enforced in `apps.content.workflow`, not here — models
stay dumb about legality of a transition, only about shape.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ContentType(models.TextChoices):
    """The closed set of Phase 2 content types (docs/20_CMS_CONTENT_MODEL.md)."""

    PAGE = "page"
    INITIATIVE = "initiative"
    NEC = "nec"
    EVENT = "event"
    BLOG = "blog"


class WorkflowState(models.TextChoices):
    """docs/07_CONTENT_WORKFLOW.md state machine."""

    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class ContentItem(TimeStampedModel):
    """
    The addressable thing (a Page, an Event, ...). Carries pointers to the
    published and draft versions independently, per
    docs/06_CMS_ARCHITECTURE.md "Draft/published separation" — editing after
    publish never mutates the live version.
    """

    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    slug = models.SlugField(max_length=140)
    owner_vertical = models.ForeignKey(
        "verticals.Vertical", null=True, blank=True, on_delete=models.PROTECT, related_name="content_items"
    )
    state = models.CharField(max_length=20, choices=WorkflowState.choices, default=WorkflowState.DRAFT)
    published_version = models.ForeignKey(
        "content.ContentVersion", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    draft_version = models.ForeignKey(
        "content.ContentVersion", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    publish_at = models.DateTimeField(null=True, blank=True)
    unpublish_at = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["content_type", "slug"]
        constraints = [
            models.UniqueConstraint(fields=["content_type", "slug"], name="unique_slug_per_content_type"),
        ]
        indexes = [models.Index(fields=["state", "publish_at"])]

    def __str__(self):
        return f"{self.content_type}:{self.slug}"

    # --- RBAC target protocol (apps.rbac.policy) ---
    def rbac_scopes(self):
        from apps.rbac.models import ScopeType

        if self.owner_vertical_id is None:
            return set()  # GLOBAL-only content: only GLOBAL grants reach it
        return {(ScopeType.VERTICAL, self.owner_vertical_id)}

    def rbac_owner_id(self):
        # own_only grants (e.g. MEMBER.content.submit) are scoped to the
        # version author, not the item — resolved by the caller against the
        # relevant ContentVersion.author, not this item directly.
        return None


class ContentVersion(TimeStampedModel):
    """
    One save of a `ContentItem`. Immutable once it leaves DRAFT (enforced in
    `apps.content.workflow`, not by a DB trigger, since the service layer is
    the only writer). `blocks` is the visual page document
    (docs/25_VISUAL_EDITOR_ARCHITECTURE.md): `{"schema_version": 1, "blocks":
    [{"id", "type", "props", "children"}]}`, validated against the active
    `ContentBlockType.json_schema` for every `type` present before save.
    """

    content_item = models.ForeignKey(ContentItem, on_delete=models.CASCADE, related_name="versions")
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=20, choices=WorkflowState.choices, default=WorkflowState.DRAFT)
    blocks = models.JSONField(default=dict)
    seo = models.JSONField(default=dict, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="content_versions")
    change_note = models.CharField(max_length=300, blank=True)
    # Snapshot of the ApprovalRule-resolved stages at the moment `submit()` was
    # called (docs/07_CONTENT_WORKFLOW.md Invariant 5: "rules are evaluated at
    # submit time and stored on the submission, so changing a rule mid-review
    # doesn't silently change what an in-flight item needs"). Empty until
    # submitted. `apps.content.workflow.approve` reads this, never a live
    # ApprovalRule query, once it is set.
    approval_stages_snapshot = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-number"]
        constraints = [
            models.UniqueConstraint(fields=["content_item", "number"], name="unique_version_number_per_item"),
        ]
        indexes = [models.Index(fields=["content_item", "state"])]

    def __str__(self):
        return f"{self.content_item}#{self.number}"

    def rbac_scopes(self):
        return self.content_item.rbac_scopes()

    def rbac_owner_id(self):
        return self.author_id


class PageDetail(TimeStampedModel):
    """Institutional page (About, Origin, Vision, Reach, History, ...)."""

    content_item = models.OneToOneField(ContentItem, on_delete=models.CASCADE, related_name="page_detail")
    title = models.CharField(max_length=200)
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)
    og_image = models.URLField(blank=True)

    def __str__(self):
        return self.title


class InitiativeDetail(TimeStampedModel):
    """Vertical/programme-level initiative."""

    content_item = models.OneToOneField(ContentItem, on_delete=models.CASCADE, related_name="initiative_detail")
    title = models.CharField(max_length=200)
    stage = models.CharField(max_length=120, blank=True)
    lead_vertical = models.ForeignKey(
        "verticals.Vertical", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    def __str__(self):
        return self.title


class NECDetail(TimeStampedModel):
    """NEC-specific institutional content."""

    content_item = models.OneToOneField(ContentItem, on_delete=models.CASCADE, related_name="nec_detail")
    title = models.CharField(max_length=200)
    edition = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return self.title


class BlogDetail(TimeStampedModel):
    """
    Authored post (docs/05_DATA_MODEL.md: "Blog: 1:1 extension of
    ContentItem"). `author` is a platform User FK for when the writer has a
    real account; `author_name` (Phase 2B) is a free-text byline for the
    common case in the source data ("E-Cell writing team") where it isn't
    one specific registered user — never invents an account to satisfy the
    FK. `external_url`/`pending` carry `BlogPost`'s remaining fields.
    """

    content_item = models.OneToOneField(ContentItem, on_delete=models.CASCADE, related_name="blog_detail")
    title = models.CharField(max_length=200)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    author_name = models.CharField(max_length=120, blank=True)
    author_vertical = models.ForeignKey(
        "verticals.Vertical", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    cover = models.URLField(blank=True)
    excerpt = models.CharField(max_length=400, blank=True)
    category = models.CharField(max_length=80, blank=True)
    external_url = models.URLField(blank=True)
    pending = models.BooleanField(default=False)
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)
    og_image = models.URLField(blank=True)

    def __str__(self):
        return self.title


class EventDetail(TimeStampedModel):
    """
    Event's public content face only (docs/23_OPERATIONS_MODEL.md,
    ADR-012). Registration/check-in/certificates are Phase 3 operational
    objects, explicitly not modeled here. `summary`/`time_label`/`audience`/
    `registration_status`/`turnout`/`pending` (Phase 2B) carry the fields
    `EventItem` (web/src/app/core/models/models.ts) has that plain
    date/venue can't: `time_label` is a free display string
    ("6:00 PM", "Fri – Sun"), not a parseable time, matching the source
    exactly rather than forcing it into a second `DateTimeField`.
    """

    content_item = models.OneToOneField(ContentItem, on_delete=models.CASCADE, related_name="event_detail")
    title = models.CharField(max_length=200)
    kind = models.CharField(max_length=80, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=200, blank=True)
    summary = models.CharField(max_length=600, blank=True)
    description = models.TextField(blank=True)
    time_label = models.CharField(max_length=60, blank=True)
    audience = models.CharField(max_length=120, blank=True)
    organizer = models.CharField(max_length=200, blank=True)
    registration_status = models.CharField(max_length=40, blank=True)
    registration_link = models.URLField(blank=True)
    turnout = models.CharField(max_length=120, blank=True)
    pending = models.BooleanField(default=False)
    # Provenance (task: "An event should not be imported twice if the same
    # LinkedIn URL already exists" — checked by the importer, not a DB
    # constraint, since blank/duplicate-null values are legitimate for
    # events with no LinkedIn post).
    linkedin_url = models.URLField(blank=True)
    source = models.CharField(max_length=40, blank=True, help_text="e.g. 'linkedin', 'official_pdf', 'manual'.")
    hashtags = models.JSONField(default=list, blank=True)
    # [{"name": str, "designation": str, "org": str}, ...] — a small enough,
    # event-specific shape that a dedicated model/table would be premature;
    # matches how `gallery` below is already represented.
    speakers = models.JSONField(default=list, blank=True)
    featured_image = models.CharField(max_length=500, blank=True)
    # [{"src": str, "alt": str}, ...]. Local static paths (e.g.
    # "/events/<slug>/01.jpg") until media uploads go through `MediaAsset`
    # (Cloudinary) — see docs note on `MediaAsset` for why that wasn't
    # wired up here: it requires real Cloudinary credentials this import
    # doesn't have, and serving the already-downloaded local files is the
    # minimum change that gets production off LinkedIn's CDN.
    gallery = models.JSONField(default=list, blank=True)
    # Join key only, not a FK: initiatives aren't CMS content yet (they still
    # live in Angular's `initiatives.data.ts`), so this just carries that
    # catalogue's string id (e.g. "bootcamp") for HomeComponent's
    # initiative → event lookup. No second initiative model/relationship —
    # it's the same id the Angular side already treats as canonical.
    related_initiative = models.CharField(max_length=80, blank=True)

    def __str__(self):
        return self.title


class ContentBlockType(TimeStampedModel):
    """
    The controlled design-system catalogue (task's "block registry").
    `json_schema` is a small internal schema format (see
    `apps.content.validation`), not full JSON Schema draft — block props are
    flat key/type/required/constraint declarations, which don't need
    draft-07 machinery. Writable only by `content_type.manage` holders.
    """

    key = models.SlugField(max_length=60, unique=True)
    label = models.CharField(max_length=120)
    json_schema = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    allowed_parent_keys = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key


class ApprovalRule(TimeStampedModel):
    """docs/07_CONTENT_WORKFLOW.md "ApprovalRule model"."""

    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)
    # Empty string ("" via blank=True, no null=True) means "matches any" — see _rule_matches.
    content_type = models.CharField(max_length=20, choices=ContentType.choices, blank=True, default="")
    owner_vertical = models.ForeignKey(
        "verticals.Vertical", null=True, blank=True, on_delete=models.CASCADE, related_name="+"
    )
    event_kind = models.CharField(max_length=80, blank=True, default="")
    # stages: [{"kind": "ORGANIZATIONAL"|"FACULTY", "permission": str, "scope": "GLOBAL"|"OWNER_VERTICAL", "min_approvers": int}]
    stages = models.JSONField(default=list)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["-priority", "name"]

    def __str__(self):
        return self.name


class Approval(TimeStampedModel):
    """A recorded decision against one stage of one `ContentVersion`."""

    class Decision(models.TextChoices):
        APPROVED = "approved"
        CHANGES_REQUESTED = "changes_requested"

    content_version = models.ForeignKey(ContentVersion, on_delete=models.CASCADE, related_name="approvals")
    stage_index = models.PositiveIntegerField()
    stage_kind = models.CharField(max_length=20)
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="content_approvals")
    decision = models.CharField(max_length=20, choices=Decision.choices)
    comment = models.CharField(max_length=1000, blank=True)

    class Meta:
        ordering = ["content_version", "stage_index"]

    def __str__(self):
        return f"{self.content_version} stage {self.stage_index}: {self.decision}"


class MediaAsset(TimeStampedModel):
    """Cloudinary-backed media (docs/21_CMS_WORKFLOW.md media reference)."""

    cloudinary_public_id = models.CharField(max_length=300)
    delivery_url = models.URLField()
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=300, blank=True)
    caption = models.CharField(max_length=300, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="uploaded_media")
    owner_vertical = models.ForeignKey(
        "verticals.Vertical", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.cloudinary_public_id

    def rbac_scopes(self):
        from apps.rbac.models import ScopeType

        if self.owner_vertical_id is None:
            return set()
        return {(ScopeType.VERTICAL, self.owner_vertical_id)}

    def rbac_owner_id(self):
        return self.uploaded_by_id
