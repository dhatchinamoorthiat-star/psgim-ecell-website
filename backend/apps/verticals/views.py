from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.api import PermissionedAPIView
from apps.rbac.models import RoleAssignment, ScopeType

from .models import Vertical
from .serializers import VerticalArchiveSerializer, VerticalSerializer

_FIELDS = ["slug", "name", "description", "display_order", "is_platform_custodian"]


def _snapshot(v: Vertical) -> dict:
    return {f: getattr(v, f) for f in [*_FIELDS, "is_active"]}


def _save(v: Vertical):
    try:
        with transaction.atomic():
            v.save()
    except IntegrityError as exc:
        raise Conflict("Another vertical already uses that slug, or is already the platform custodian.") from exc


class VerticalListView(PermissionedAPIView):
    required_perms = {"GET": P.VERTICAL_VIEW, "POST": P.VERTICAL_MANAGE}

    @extend_schema(responses=VerticalSerializer(many=True))
    def get(self, request):
        scopes = policy.scopes_for(request.user, P.VERTICAL_VIEW)
        qs = Vertical.objects.all()
        if not scopes.is_global:
            qs = qs.filter(pk__in=scopes.ids_for(ScopeType.VERTICAL))
        if request.query_params.get("include_archived") != "true":
            qs = qs.filter(is_active=True)
        return self.paginated(qs, VerticalSerializer)

    @extend_schema(request=VerticalSerializer, responses={201: VerticalSerializer})
    def post(self, request):
        self.require(P.VERTICAL_MANAGE)
        s = VerticalSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            vertical = Vertical(**s.validated_data, created_by=request.user)
            _save(vertical)
            audit.record(request, "vertical.create", target=vertical,
                         summary=f"{request.user.email} created vertical {vertical.name}.", after=_snapshot(vertical))  # fmt: skip
        return Response(VerticalSerializer(vertical).data, status=status.HTTP_201_CREATED)


class _VerticalObject(PermissionedAPIView):
    def get_vertical(self, pk) -> Vertical:
        v = Vertical.objects.filter(pk=pk).first()
        if v is None or not policy.has_perm(self.request.user, P.VERTICAL_VIEW, v):
            raise NotFound()
        return v


class VerticalDetailView(_VerticalObject):
    required_perms = {"GET": P.VERTICAL_VIEW, "PATCH": P.VERTICAL_MANAGE}

    @extend_schema(responses=VerticalSerializer)
    def get(self, request, pk):
        return Response(VerticalSerializer(self.get_vertical(pk)).data)

    @extend_schema(request=VerticalSerializer, responses=VerticalSerializer)
    def patch(self, request, pk):
        vertical = self.get_vertical(pk)
        self.require(P.VERTICAL_MANAGE)  # organisation-wide: heads cannot rename their own vertical
        if not vertical.is_active:
            raise Conflict("Archived verticals cannot be edited.")
        s = VerticalSerializer(vertical, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        before = _snapshot(vertical)
        with transaction.atomic():
            for k, val in s.validated_data.items():
                setattr(vertical, k, val)
            _save(vertical)
            audit.record(request, "vertical.update", target=vertical, summary=f"{request.user.email} edited vertical {vertical.name}.",
                         before=before, after=_snapshot(vertical))  # fmt: skip
        return Response(VerticalSerializer(vertical).data)


class VerticalArchiveView(_VerticalObject):
    """Archive instead of delete: history, memberships and assignments stay attached."""

    required_perms = {"POST": P.VERTICAL_MANAGE}

    @extend_schema(request=VerticalArchiveSerializer, responses=VerticalSerializer)
    def post(self, request, pk):
        vertical = self.get_vertical(pk)
        self.require(P.VERTICAL_MANAGE)
        s = VerticalArchiveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if s.validated_data["confirm"] != vertical.slug:
            raise ValidationError({"confirm": [f"Type {vertical.slug!r} to confirm archiving this vertical."]})
        if not vertical.is_active:
            raise Conflict("This vertical is already archived.")
        live = RoleAssignment.objects.in_force().filter(scope_type=ScopeType.VERTICAL, scope_id=vertical.pk).count()
        if live:
            raise Conflict(f"Revoke the {live} active role assignment(s) in this vertical first.")
        before = _snapshot(vertical)
        with transaction.atomic():
            vertical.is_active = False
            vertical.archived_at = timezone.now()
            vertical.archived_by = request.user
            vertical.is_platform_custodian = False
            vertical.save()
            audit.record(request, "vertical.archive", target=vertical, summary=f"{request.user.email} archived vertical {vertical.name}.",
                         before=before, after=_snapshot(vertical))  # fmt: skip
        return Response(VerticalSerializer(vertical).data)
