from rest_framework import serializers

from .models import Approval, ApprovalRule, ContentBlockType, ContentItem, ContentVersion, MediaAsset


class ContentVersionSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)
    # Read-only passthrough of the parent item's identity — lets a list view
    # (e.g. "My submissions", Phase 2D) show what a version belongs to
    # without a second round-trip per row. Requires the caller's queryset to
    # `select_related("content_item")`; every current call site already does.
    content_type = serializers.CharField(source="content_item.content_type", read_only=True)
    slug = serializers.CharField(source="content_item.slug", read_only=True)

    class Meta:
        model = ContentVersion
        fields = [
            "id", "content_item", "content_type", "slug", "number", "state", "blocks", "seo", "author_email",
            "change_note", "approval_stages_snapshot", "created_at", "updated_at",
        ]  # fmt: skip
        read_only_fields = [
            "id", "content_item", "number", "state", "author_email", "approval_stages_snapshot", "created_at", "updated_at",
        ]  # fmt: skip


class ContentItemSerializer(serializers.ModelSerializer):
    owner_vertical = serializers.UUIDField(source="owner_vertical_id", read_only=True)
    published_version_number = serializers.IntegerField(source="published_version.number", read_only=True, default=None)
    draft_version_number = serializers.IntegerField(source="draft_version.number", read_only=True, default=None)
    # Version ids (not just numbers) — this serializer is only ever used
    # behind authenticated, scope-checked views (never the public endpoint,
    # which builds its own plain dict response), so exposing the id here
    # is safe and is exactly what the Phase 2C editor needs to know which
    # version to fetch/PATCH (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
    # "Editor routing").
    published_version_id = serializers.UUIDField(read_only=True, default=None)
    draft_version_id = serializers.UUIDField(read_only=True, default=None)

    class Meta:
        model = ContentItem
        fields = [
            "id", "content_type", "slug", "owner_vertical", "state", "published_version_number",
            "draft_version_number", "published_version_id", "draft_version_id",
            "publish_at", "unpublish_at", "is_verified", "created_at",
        ]  # fmt: skip
        read_only_fields = [
            "id", "state", "published_version_number", "draft_version_number",
            "published_version_id", "draft_version_id", "created_at",
        ]  # fmt: skip


class ContentItemCreateSerializer(serializers.Serializer):
    content_type = serializers.ChoiceField(choices=ContentItem._meta.get_field("content_type").choices)
    slug = serializers.SlugField(max_length=140)
    owner_vertical_id = serializers.UUIDField(required=False, allow_null=True)
    blocks = serializers.JSONField()
    seo = serializers.JSONField(required=False)


class DraftUpdateSerializer(serializers.Serializer):
    blocks = serializers.JSONField()
    seo = serializers.JSONField(required=False)
    change_note = serializers.CharField(required=False, allow_blank=True, max_length=300)
    # Optimistic concurrency (Phase 2C): the `updated_at` the editor last
    # saw for this version. Omit it to skip the check (non-editor callers).
    expected_updated_at = serializers.DateTimeField(required=False, allow_null=True)


class ChangeNoteSerializer(serializers.Serializer):
    change_note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class ReviewCommentSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=1000)


class ApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ScheduleSerializer(serializers.Serializer):
    publish_at = serializers.DateTimeField()


class RevertSerializer(serializers.Serializer):
    source_version_id = serializers.UUIDField()


class ReviewInboxItemSerializer(serializers.Serializer):
    """
    One `ContentVersion` awaiting the requesting user's action (Phase 2D
    reviewer inbox). `pending_action` is computed per-request against the
    viewer (never stored) — "open_review" for a SUBMITTED version the
    viewer may open, "approve" for an IN_REVIEW version whose next
    unsatisfied stage the viewer may satisfy. See views.ReviewInboxView.
    """

    id = serializers.UUIDField()
    number = serializers.IntegerField()
    state = serializers.CharField()
    content_item_id = serializers.UUIDField()
    content_type = serializers.CharField(source="content_item.content_type")
    slug = serializers.CharField(source="content_item.slug")
    owner_vertical = serializers.UUIDField(source="content_item.owner_vertical_id", allow_null=True)
    author_email = serializers.EmailField(source="author.email")
    change_note = serializers.CharField()
    updated_at = serializers.DateTimeField()
    pending_action = serializers.CharField()


class ApprovalSerializer(serializers.ModelSerializer):
    approver_email = serializers.EmailField(source="approver.email", read_only=True)

    class Meta:
        model = Approval
        fields = ["id", "content_version", "stage_index", "stage_kind", "approver_email", "decision", "comment", "created_at"]


class ApprovalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRule
        fields = [
            "id", "name", "is_active", "priority", "content_type", "owner_vertical", "event_kind", "stages", "created_at",
        ]  # fmt: skip


class ContentBlockTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentBlockType
        fields = ["id", "key", "label", "json_schema", "version", "is_active", "allowed_parent_keys"]


class MediaAssetSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = MediaAsset
        fields = [
            "id", "cloudinary_public_id", "delivery_url", "width", "height", "mime_type", "file_size",
            "alt_text", "caption", "uploaded_by_email", "owner_vertical", "usage_count", "created_at",
        ]  # fmt: skip
        read_only_fields = ["id", "uploaded_by_email", "usage_count", "created_at"]


class MediaAssetCreateSerializer(serializers.Serializer):
    """
    Records a MediaAsset for a file already uploaded to Cloudinary via the
    signed-upload flow (apps.content.media.signed_upload_params) — the
    browser never sees the Cloudinary API secret (task §21).
    """

    cloudinary_public_id = serializers.CharField(max_length=300)
    delivery_url = serializers.URLField()
    width = serializers.IntegerField(required=False, allow_null=True)
    height = serializers.IntegerField(required=False, allow_null=True)
    mime_type = serializers.CharField(required=False, allow_blank=True, max_length=100)
    file_size = serializers.IntegerField(required=False, allow_null=True)
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=300)
    caption = serializers.CharField(required=False, allow_blank=True, max_length=300)
    owner_vertical_id = serializers.UUIDField(required=False, allow_null=True)
