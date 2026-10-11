"""
Authenticated event administration API (Phase B, B2) — /api/v1/content/events.

Thin views over `apps.content.workflow`; every state change goes through the
workflow functions, which re-check event permissions at the service boundary
(`workflow.require_event_perm`) and write the audit rows.

| Method & path                          | Needs                                  |
|----------------------------------------|----------------------------------------|
| GET    /content/events                 | event.view (rows filtered to scope)    |
| POST   /content/events                 | event.create at the target scope       |
| GET    /content/events/<slug>          | event.view on the event (else 404)     |
| PATCH  /content/events/<slug>          | event.edit on the event                |
| POST   /content/events/<slug>/submit   | event.edit                             |
| POST   /content/events/<slug>/publish  | event.edit + content.publish (+ approval) |
| POST   /content/events/<slug>/unpublish| event.edit + content.publish           |
| DELETE /content/events/<slug>          | event.delete (archives; never deletes) |

Publishing never skips approval: `workflow.publish` accepts only an APPROVED
version, and review/approval happen in the existing approvals inbox.
Scheduling is deliberately not offered (no executor yet; P6).
"""

from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.api import PermissionedAPIView
from apps.rbac.models import ScopeType
from apps.rbac.policy import ScopeTarget

from . import dynamic_queries, event_detail, workflow
from .models import ContentItem, ContentType, WorkflowState

EMPTY_BLOCKS = {"schema_version": 1, "blocks": []}
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class EventCreateSerializer(serializers.Serializer):
    slug = serializers.RegexField(
        SLUG_PATTERN, max_length=140, error_messages={"invalid": "Lowercase letters, digits and single hyphens only."}
    )
    owner_vertical_id = serializers.UUIDField(required=False, allow_null=True)
    detail = serializers.JSONField()


class EventUpdateSerializer(serializers.Serializer):
    detail = serializers.JSONField()
    expected_updated_at = serializers.DateTimeField(required=False, allow_null=True)
    change_note = serializers.CharField(required=False, allow_blank=True, max_length=300, default="")


def _version_payload(version):
    if version is None:
        return None
    return {
        "id": str(version.id),
        "number": version.number,
        "state": version.state,
        "detail": version.detail,
        "updated_at": version.updated_at,
    }


def event_payload(item: ContentItem) -> dict:
    return {
        "id": str(item.id),
        "slug": item.slug,
        "state": item.state,
        "owner_vertical": str(item.owner_vertical_id) if item.owner_vertical_id else None,
        "is_published": item.published_version_id is not None,
        "draft": _version_payload(item.draft_version),
        "published": _version_payload(item.published_version),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _events_visible_to(user):
    scopes = policy.scopes_for(user, P.EVENT_VIEW)
    qs = ContentItem.objects.filter(content_type=ContentType.EVENT).select_related("draft_version", "published_version")
    if not scopes.is_global:
        qs = qs.filter(owner_vertical_id__in=scopes.ids_for(ScopeType.VERTICAL))
    return qs


class _EventBase(PermissionedAPIView):
    def get_event(self, slug, perm=P.EVENT_VIEW) -> ContentItem:
        """404 — never 403 — outside the caller's scope, so existence does not leak."""
        item = (
            ContentItem.objects.select_related("draft_version", "published_version")
            .filter(content_type=ContentType.EVENT, slug=slug)
            .first()
        )
        if item is None or not policy.has_perm(self.request.user, P.EVENT_VIEW, item):
            raise NotFound()
        if perm != P.EVENT_VIEW:
            self.require(perm, item)
        return item

    def respond(self, item, code=status.HTTP_200_OK):
        item.refresh_from_db()
        return Response(event_payload(item), status=code)


class EventListView(_EventBase):
    required_perms = {"GET": P.EVENT_VIEW, "POST": P.EVENT_CREATE}

    def get(self, request):
        qs = _events_visible_to(request.user)
        if q := request.query_params.get("q"):
            qs = qs.filter(Q(slug__icontains=q) | Q(event_detail__title__icontains=q))
        return Response({"results": [event_payload(i) for i in qs.order_by("-updated_at")[:200]]})

    def post(self, request):
        s = EventCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        vertical_id = d.get("owner_vertical_id")
        target = ScopeTarget(ScopeType.VERTICAL, vertical_id) if vertical_id else ScopeTarget(ScopeType.GLOBAL)
        self.require(P.EVENT_CREATE, target)
        detail = event_detail.validate_editor_input(d["detail"], source="manual")
        with transaction.atomic():
            try:
                with transaction.atomic():
                    item = ContentItem.objects.create(
                        content_type=ContentType.EVENT, slug=d["slug"], owner_vertical_id=vertical_id, created_by=request.user
                    )
            except IntegrityError as exc:
                raise Conflict("An event with this slug already exists.") from exc
            audit.record(request, "event.created", summary=f"Created event {item.slug}", target=item)
            workflow.create_draft(request, content_item=item, blocks=EMPTY_BLOCKS, detail=detail, change_note="Created")
        return self.respond(item, status.HTTP_201_CREATED)


class EventDetailView(_EventBase):
    required_perms = {"GET": P.EVENT_VIEW, "PATCH": P.EVENT_EDIT, "DELETE": P.EVENT_DELETE}

    def get(self, request, slug):
        return Response(event_payload(self.get_event(slug)))

    def patch(self, request, slug):
        item = self.get_event(slug, P.EVENT_EDIT)
        s = EventUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        base = item.draft_version or item.published_version
        detail = event_detail.validate_editor_input(d["detail"], current=base.detail if base else None)
        draft = item.draft_version
        if draft is not None and draft.state == WorkflowState.DRAFT:
            workflow.update_draft(
                request, version=draft, blocks=draft.blocks, seo=draft.seo, detail=detail,
                change_note=d["change_note"], expected_updated_at=d.get("expected_updated_at"),
            )  # fmt: skip
        else:
            # The current draft is in review/approved (immutable) or there is none:
            # editing starts a new draft, exactly like the generic "new draft" action.
            if d.get("expected_updated_at") is not None and draft is not None and draft.updated_at != d["expected_updated_at"]:
                raise workflow.StaleVersion()
            source = draft or item.published_version
            workflow.create_draft(
                request, content_item=item, blocks=source.blocks if source else EMPTY_BLOCKS,
                seo=source.seo if source else {}, detail=detail, change_note=d["change_note"],
            )  # fmt: skip
        return self.respond(item)

    def delete(self, request, slug):
        item = self.get_event(slug, P.EVENT_DELETE)
        with transaction.atomic():
            if item.published_version_id is not None:
                workflow.unpublish(request, item=item)
                item.refresh_from_db()
            item.state = WorkflowState.ARCHIVED
            item.save(update_fields=["state", "updated_at"])
            audit.record(request, "event.archived", summary=f"Archived event {item.slug}", target=item)
        return self.respond(item)


class EventSubmitView(_EventBase):
    required_perms = {"POST": P.EVENT_EDIT}

    def post(self, request, slug):
        item = self.get_event(slug, P.EVENT_EDIT)
        draft = item.draft_version
        if draft is None or draft.state != WorkflowState.DRAFT:
            raise Conflict("There is no draft to submit.")
        workflow.submit(request, version=draft)
        return self.respond(item)


class EventPublishView(_EventBase):
    required_perms = {"POST": P.EVENT_EDIT}

    def post(self, request, slug):
        item = self.get_event(slug, P.EVENT_EDIT)
        version = item.draft_version
        if version is None or version.state != WorkflowState.APPROVED:
            raise Conflict("Only an approved version can be published. Submit it and have it approved first.")
        workflow.publish(request, version=version)  # re-checks event.edit + content.publish + detail validity
        return self.respond(item)


class EventUnpublishView(_EventBase):
    required_perms = {"POST": P.EVENT_EDIT}

    def post(self, request, slug):
        item = self.get_event(slug, P.EVENT_EDIT)
        workflow.unpublish(request, item=item)  # re-checks event.edit + content.publish
        return self.respond(item)


class PublicEventDetailView(APIView):
    """
    GET /api/v1/content/public/events/<slug> — one published event (Phase B, B3).

    Unauthenticated and read-only. Only an item with a *published* version is
    served, from the EventDetail projection (which publishing alone writes),
    using the same serializer as the public listings so the two can never
    disagree. Drafts, unpublished, archived and nonexistent slugs all get the
    identical 404 — the response never reveals that a private event exists.
    """

    public = True  # declared for the URL-coverage test
    permission_classes = [AllowAny]
    authentication_classes = []  # never touches the session; no CSRF needed for GET

    def get(self, request, slug):
        item = (
            ContentItem.objects.select_related("event_detail", "published_version")
            .filter(content_type=ContentType.EVENT, slug=slug, published_version__isnull=False, event_detail__isnull=False)
            .first()
        )
        if item is None:
            raise NotFound()
        return Response(dynamic_queries.serialize_event(item), headers={"Cache-Control": "no-store"})
