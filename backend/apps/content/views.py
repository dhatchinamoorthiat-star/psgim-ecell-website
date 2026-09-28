import uuid

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.api import AUTHENTICATED, PermissionedAPIView
from apps.rbac.models import ScopeType
from apps.rbac.policy import ScopeTarget

from . import media, workflow
from .models import Approval, ApprovalRule, ContentBlockType, ContentItem, ContentVersion, MediaAsset
from .serializers import (
    ApprovalRuleSerializer,
    ApprovalSerializer,
    ApproveSerializer,
    ContentBlockTypeSerializer,
    ContentItemCreateSerializer,
    ContentItemSerializer,
    ContentVersionSerializer,
    DraftUpdateSerializer,
    MediaAssetCreateSerializer,
    MediaAssetSerializer,
    RevertSerializer,
    ReviewCommentSerializer,
    ScheduleSerializer,
)


def _visible_items(request):
    scopes = policy.scopes_for(request.user, P.CONTENT_VIEW)
    qs = ContentItem.objects.all()
    if not scopes.is_global:
        qs = qs.filter(owner_vertical_id__in=scopes.ids_for(ScopeType.VERTICAL))
    return qs


class ContentItemListView(PermissionedAPIView):
    required_perms = {"GET": P.CONTENT_VIEW, "POST": P.CONTENT_SUBMIT}

    def get(self, request):
        qs = _visible_items(request)
        if content_type := request.query_params.get("content_type"):
            qs = qs.filter(content_type=content_type)
        return self.paginated(qs, ContentItemSerializer)

    def post(self, request):
        s = ContentItemCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        owner_vertical_id = d.get("owner_vertical_id")
        # Creating a brand-new item is an authoring action at the target scope
        # (own_only submitters act on content they already authored, via
        # ContentVersionSubmitView instead — see workflow.py docstring).
        target = ScopeTarget(ScopeType.VERTICAL, owner_vertical_id) if owner_vertical_id else ScopeTarget(ScopeType.GLOBAL)
        self.require(P.CONTENT_SUBMIT, target)
        with transaction.atomic():
            item = ContentItem(
                content_type=d["content_type"], slug=d["slug"], owner_vertical_id=owner_vertical_id,
                created_by=request.user,
            )  # fmt: skip
            try:
                item.save()
            except IntegrityError as exc:
                raise Conflict("A content item with this type and slug already exists.") from exc
            audit.record(request, "content.created", summary=f"Created {item}", target=item)
            workflow.create_draft(request, content_item=item, blocks=d["blocks"], seo=d.get("seo") or {})
        return Response(ContentItemSerializer(item).data, status=status.HTTP_201_CREATED)


class ContentItemDetailView(PermissionedAPIView):
    required_perms = {"GET": P.CONTENT_VIEW}

    def get_item(self, pk) -> ContentItem:
        item = get_object_or_404(ContentItem, pk=pk)
        if not policy.has_perm(self.request.user, P.CONTENT_VIEW, item):
            raise NotFound()  # no existence leak outside scope
        return item

    def get(self, request, pk):
        return Response(ContentItemSerializer(self.get_item(pk)).data)


class MyContentVersionsListView(PermissionedAPIView):
    """
    Every signed-in user's own authored versions, regardless of whether they
    hold `content.view` anywhere. Closes the gap where an own_only
    `content.submit` holder (e.g. MEMBER) could PATCH a draft they authored
    but had no way to discover or read it (gate-review finding). Scope is
    author identity, not vertical — a member never sees anyone else's drafts
    through this endpoint, in or out of their vertical.
    """

    required_perms = {"GET": AUTHENTICATED}

    def get(self, request):
        qs = ContentVersion.objects.filter(author=request.user).select_related("content_item")
        return self.paginated(qs, ContentVersionSerializer)


class ContentItemUnpublishView(PermissionedAPIView):
    required_perms = {"POST": P.CONTENT_PUBLISH}

    def post(self, request, pk):
        item = get_object_or_404(ContentItem, pk=pk)
        self.require(P.CONTENT_PUBLISH, item)
        version = workflow.unpublish(request, item=item)
        return Response(ContentVersionSerializer(version).data)


class ContentItemRevertView(PermissionedAPIView):
    required_perms = {"POST": P.CONTENT_SUBMIT}

    def post(self, request, pk):
        item = get_object_or_404(ContentItem, pk=pk)
        self.require(P.CONTENT_SUBMIT, item)
        s = RevertSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        source = get_object_or_404(ContentVersion, pk=s.validated_data["source_version_id"])
        new_version = workflow.revert(request, item=item, source_version=source)
        return Response(ContentVersionSerializer(new_version).data, status=status.HTTP_201_CREATED)


class ContentVersionDetailView(PermissionedAPIView):
    # GET's coarse gate is only "signed in" — the real check is object-level in
    # get_version() (content.view OR own-authored), because an own_only
    # content.submit holder (MEMBER) may hold no content.view grant anywhere
    # and would otherwise be blocked before that object-level check ever runs.
    required_perms = {"GET": AUTHENTICATED, "PATCH": P.CONTENT_SUBMIT}

    def get_version(self, pk) -> ContentVersion:
        version = get_object_or_404(ContentVersion.objects.select_related("content_item"), pk=pk)
        # An own_only content.submit holder (e.g. MEMBER) has no content.view
        # grant at all but must still be able to read a draft they authored,
        # to discover its current state before editing/resubmitting it —
        # this mirrors the own_only check PATCH already applies, it doesn't
        # add a new permission.
        is_own = version.author_id == self.request.user.id
        if not is_own and not policy.has_perm(self.request.user, P.CONTENT_VIEW, version):
            raise NotFound()
        return version

    def get(self, request, pk):
        return Response(ContentVersionSerializer(self.get_version(pk)).data)

    def patch(self, request, pk):
        version = self.get_version(pk)
        self.require(P.CONTENT_SUBMIT, version)
        s = DraftUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        version = workflow.update_draft(
            request, version=version, blocks=d["blocks"], seo=d.get("seo"), change_note=d.get("change_note", "")
        )
        return Response(ContentVersionSerializer(version).data)


class ContentVersionNewDraftView(PermissionedAPIView):
    """Produces a new DRAFT from a CHANGES_REQUESTED/APPROVED/PUBLISHED version, per
    docs/07_CONTENT_WORKFLOW.md ("any edit after APPROVED" / "CHANGES_REQUESTED loops
    back to DRAFT on edit" — both mean a *new* version, never an in-place mutation)."""

    required_perms = {"POST": P.CONTENT_SUBMIT}

    def post(self, request, pk):
        version = get_object_or_404(ContentVersion.objects.select_related("content_item"), pk=pk)
        self.require(P.CONTENT_SUBMIT, version)
        s = DraftUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        new_version = workflow.create_draft(
            request, content_item=version.content_item, blocks=d["blocks"], seo=d.get("seo") or {},
            change_note=d.get("change_note", ""),
        )  # fmt: skip
        return Response(ContentVersionSerializer(new_version).data, status=status.HTTP_201_CREATED)


class _VersionActionView(PermissionedAPIView):
    action_perm: str
    serializer_class = None

    def _version(self, pk) -> ContentVersion:
        version = get_object_or_404(ContentVersion.objects.select_related("content_item"), pk=pk)
        self.require(self.action_perm, version)
        return version

    def _data(self, request) -> dict:
        if self.serializer_class is None:
            return {}
        s = self.serializer_class(data=request.data)
        s.is_valid(raise_exception=True)
        return s.validated_data


class ContentVersionSubmitView(_VersionActionView):
    required_perms = {"POST": P.CONTENT_SUBMIT}
    action_perm = P.CONTENT_SUBMIT

    def post(self, request, pk):
        version = self._version(pk)
        return Response(ContentVersionSerializer(workflow.submit(request, version=version)).data)


class ContentVersionOpenReviewView(_VersionActionView):
    required_perms = {"POST": P.CONTENT_REVIEW}
    action_perm = P.CONTENT_REVIEW

    def post(self, request, pk):
        version = self._version(pk)
        return Response(ContentVersionSerializer(workflow.open_review(request, version=version)).data)


class ContentVersionRequestChangesView(_VersionActionView):
    required_perms = {"POST": P.CONTENT_REVIEW}
    action_perm = P.CONTENT_REVIEW
    serializer_class = ReviewCommentSerializer

    def post(self, request, pk):
        version = self._version(pk)
        d = self._data(request)
        return Response(ContentVersionSerializer(workflow.request_changes(request, version=version, comment=d["comment"])).data)


class ContentVersionApproveView(_VersionActionView):
    """Coarse gate accepts either `content.approve` or `content.approve_faculty` (a
    Faculty Advisor holds only the latter); `workflow.approve` re-checks the exact
    stage permission before recording the decision — the coarse gate here only
    rules out users who hold neither approval permission anywhere."""

    required_perms = {"POST": P.CONTENT_APPROVE}
    action_perm = P.CONTENT_VIEW  # fine-grained stage permission enforced inside workflow.approve
    serializer_class = ApproveSerializer

    def get_permissions(self):
        if self.request.method == "POST" and not policy.holds_anywhere(self.request.user, P.CONTENT_APPROVE):
            if policy.holds_anywhere(self.request.user, P.CONTENT_APPROVE_FACULTY):
                self.required_perms = {**self.required_perms, "POST": P.CONTENT_APPROVE_FACULTY}
        return super().get_permissions()

    def post(self, request, pk):
        version = self._version(pk)
        d = self._data(request)
        result = workflow.approve(request, version=version, comment=d.get("comment", ""))
        return Response(ContentVersionSerializer(result).data)


class ContentVersionScheduleView(_VersionActionView):
    required_perms = {"POST": P.CONTENT_SCHEDULE}
    action_perm = P.CONTENT_SCHEDULE
    serializer_class = ScheduleSerializer

    def post(self, request, pk):
        version = self._version(pk)
        d = self._data(request)
        return Response(ContentVersionSerializer(workflow.schedule(request, version=version, publish_at=d["publish_at"])).data)


class ContentVersionPublishView(_VersionActionView):
    required_perms = {"POST": P.CONTENT_PUBLISH}
    action_perm = P.CONTENT_PUBLISH

    def post(self, request, pk):
        version = self._version(pk)
        return Response(ContentVersionSerializer(workflow.publish(request, version=version)).data)


class ApprovalHistoryView(PermissionedAPIView):
    """
    Read-only approval trail for a version — stage, approver, decision,
    comment, timestamp — so a reviewer/editor UI can show why a version is
    or isn't approved yet. Scoped exactly like the version itself: the
    author may read their own version's history (own_only content.submit),
    everyone else needs content.view at the version's scope. Never exposes
    approvals outside that scope (gate-review finding: this existed as an
    unused serializer with no endpoint at all).
    """

    required_perms = {"GET": AUTHENTICATED}

    def get(self, request, pk):
        version = get_object_or_404(ContentVersion.objects.select_related("content_item"), pk=pk)
        is_own = version.author_id == request.user.id
        if not is_own and not policy.has_perm(request.user, P.CONTENT_VIEW, version):
            raise NotFound()
        qs = Approval.objects.filter(content_version=version).select_related("approver")
        return self.paginated(qs, ApprovalSerializer)


class PublicContentDetailView(APIView):
    """
    Unauthenticated, read-only. Exposes only `published_version` — drafts,
    rejected, and in-review content are never reachable here
    (docs/06_CMS_ARCHITECTURE.md "Published content isolation"). This is
    what the Phase 2B prerender step will consume; not wired to Angular yet.
    """

    permission_classes = [AllowAny]
    public = True

    def get(self, request, content_type, slug):
        item = get_object_or_404(ContentItem, content_type=content_type, slug=slug)
        if item.published_version_id is None:
            raise NotFound()
        return Response(
            {
                "content_type": item.content_type,
                "slug": item.slug,
                "blocks": item.published_version.blocks,
                "seo": item.published_version.seo,
                "published_at": item.published_version.updated_at,
            }
        )


class ApprovalRuleListView(PermissionedAPIView):
    required_perms = {"GET": P.APPROVAL_RULE_MANAGE, "POST": P.APPROVAL_RULE_MANAGE}

    def get(self, request):
        return self.paginated(ApprovalRule.objects.all(), ApprovalRuleSerializer)

    def post(self, request):
        s = ApprovalRuleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        rule = ApprovalRule.objects.create(**s.validated_data, created_by=request.user)
        audit.record(request, "approval_rule.create", summary=f"Created approval rule {rule.name}", target=rule)
        return Response(ApprovalRuleSerializer(rule).data, status=status.HTTP_201_CREATED)


class ContentBlockTypeListView(PermissionedAPIView):
    required_perms = {"GET": P.CONTENT_VIEW, "POST": P.CONTENT_TYPE_MANAGE}

    def get(self, request):
        return self.paginated(ContentBlockType.objects.filter(is_active=True), ContentBlockTypeSerializer)

    def post(self, request):
        s = ContentBlockTypeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        block_type = ContentBlockType.objects.create(**s.validated_data)
        audit.record(request, "content_type.create", summary=f"Created block type {block_type.key}", target=block_type)
        return Response(ContentBlockTypeSerializer(block_type).data, status=status.HTTP_201_CREATED)


def _upload_target(owner_vertical_id) -> ScopeTarget:
    return ScopeTarget(ScopeType.VERTICAL, owner_vertical_id) if owner_vertical_id else ScopeTarget(ScopeType.GLOBAL)


def _visible_media(request):
    """Mirrors `_visible_items`: a vertically-scoped viewer sees only their vertical's
    media, never org-wide media (gate-review finding — this previously had no filter at all)."""
    scopes = policy.scopes_for(request.user, P.CONTENT_VIEW)
    qs = MediaAsset.objects.all()
    if not scopes.is_global:
        qs = qs.filter(owner_vertical_id__in=scopes.ids_for(ScopeType.VERTICAL))
    return qs


class MediaUploadParamsView(PermissionedAPIView):
    required_perms = {"GET": P.MEDIA_UPLOAD}

    def get(self, request):
        raw = request.query_params.get("owner_vertical_id") or None
        try:
            owner_vertical_id = uuid.UUID(raw) if raw else None
        except ValueError as exc:
            raise ValidationError({"owner_vertical_id": ["Must be a valid UUID."]}) from exc
        self.require(P.MEDIA_UPLOAD, _upload_target(owner_vertical_id))
        return Response(media.signed_upload_params(owner_vertical_id=owner_vertical_id))


class MediaAssetListView(PermissionedAPIView):
    required_perms = {"GET": P.CONTENT_VIEW, "POST": P.MEDIA_UPLOAD}

    def get(self, request):
        return self.paginated(_visible_media(request), MediaAssetSerializer)

    def post(self, request):
        s = MediaAssetCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        owner_vertical_id = d.get("owner_vertical_id")
        # Never trust the client's owner_vertical_id — verify the actor actually
        # holds media.upload for that exact scope before creating anything
        # (gate-review finding: this was previously unchecked).
        self.require(P.MEDIA_UPLOAD, _upload_target(owner_vertical_id))
        asset = MediaAsset.objects.create(uploaded_by=request.user, **d)
        audit.record(request, "media.uploaded", summary=f"Uploaded media {asset.cloudinary_public_id}", target=asset)
        return Response(MediaAssetSerializer(asset).data, status=status.HTTP_201_CREATED)
