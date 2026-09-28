from rest_framework import serializers

from .models import Approval, ApprovalRule, ContentBlockType, ContentItem, ContentVersion, MediaAsset


class ContentVersionSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = ContentVersion
        fields = [
            "id", "content_item", "number", "state", "blocks", "seo", "author_email", "change_note",
            "approval_stages_snapshot", "created_at",
        ]  # fmt: skip
        read_only_fields = ["id", "content_item", "number", "state", "author_email", "approval_stages_snapshot", "created_at"]


class ContentItemSerializer(serializers.ModelSerializer):
    owner_vertical = serializers.UUIDField(source="owner_vertical_id", read_only=True)
    published_version_number = serializers.IntegerField(source="published_version.number", read_only=True, default=None)
    draft_version_number = serializers.IntegerField(source="draft_version.number", read_only=True, default=None)

    class Meta:
        model = ContentItem
        fields = [
            "id", "content_type", "slug", "owner_vertical", "state", "published_version_number",
            "draft_version_number", "publish_at", "unpublish_at", "is_verified", "created_at",
        ]  # fmt: skip
        read_only_fields = ["id", "state", "published_version_number", "draft_version_number", "created_at"]


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
