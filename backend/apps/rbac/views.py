from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from apps.accounts.models import User
from apps.memberships.models import AcademicYear

from . import catalogue as P
from . import policy, services
from .api import PermissionedAPIView
from .models import Permission, Role, RoleAssignment, RolePermission, ScopeType
from .serializers import (
    PermissionSerializer,
    RevokeSerializer,
    RoleAssignmentCreateSerializer,
    RoleAssignmentSerializer,
    RoleSerializer,
)


class PermissionListView(PermissionedAPIView):
    required_perms = {"GET": P.PERMISSION_VIEW}

    @extend_schema(responses=PermissionSerializer(many=True))
    def get(self, request):
        self.require(P.PERMISSION_VIEW)
        return Response(PermissionSerializer(Permission.objects.all(), many=True).data)


class RoleListView(PermissionedAPIView):
    """Roles are read-only through the API in Phase 1 (custom roles are deferred)."""

    required_perms = {"GET": P.ROLE_VIEW}

    @extend_schema(responses=RoleSerializer(many=True))
    def get(self, request):
        roles = Role.objects.prefetch_related(Prefetch("rolepermission_set", queryset=RolePermission.objects.all()))
        return Response(RoleSerializer(roles, many=True).data)


class RoleAssignmentListView(PermissionedAPIView):
    required_perms = {"GET": P.ROLE_VIEW, "POST": P.ROLE_ASSIGN}

    def get_permissions(self):
        # Assigning a vertical head needs vertical_head.assign, not role.assign;
        # the service checks the exact permission, so the coarse gate accepts either.
        if self.request.method == "POST" and policy.holds_anywhere(self.request.user, P.VERTICAL_HEAD_ASSIGN):
            self.required_perms = {**self.required_perms, "POST": P.VERTICAL_HEAD_ASSIGN}
        return super().get_permissions()

    @extend_schema(responses=RoleAssignmentSerializer(many=True))
    def get(self, request):
        scopes = policy.scopes_for(request.user, P.ROLE_VIEW)
        qs = RoleAssignment.objects.select_related("user", "role", "assigned_by", "revoked_by", "academic_year")
        if not scopes.is_global:
            qs = qs.filter(scope_type=ScopeType.VERTICAL, scope_id__in=scopes.ids_for(ScopeType.VERTICAL))
        if request.query_params.get("active") == "true":
            qs = qs.filter(revoked_at__isnull=True)
        if user_id := request.query_params.get("user_id"):
            qs = qs.filter(user_id=user_id)
        if scope_id := request.query_params.get("scope_id"):
            qs = qs.filter(scope_id=scope_id)
        if role := request.query_params.get("role"):
            qs = qs.filter(role__key=role)
        return self.paginated(qs, RoleAssignmentSerializer)

    @extend_schema(request=RoleAssignmentCreateSerializer, responses={201: RoleAssignmentSerializer})
    def post(self, request):
        s = RoleAssignmentCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        user = User.objects.filter(pk=d["user_id"]).first()
        if user is None:
            return Response(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "Some fields are invalid.",
                        "fields": {"user_id": ["Unknown user."]},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        year = get_object_or_404(AcademicYear, pk=d["academic_year_id"]) if d.get("academic_year_id") else None
        assignment = services.assign_role(
            request, user=user, role=d["role"], scope_type=d["scope_type"], scope_id=d.get("scope_id"),
            academic_year=year, ends_at=d.get("ends_at"), note=d.get("note", ""),
        )  # fmt: skip
        return Response(RoleAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class RoleAssignmentRevokeView(PermissionedAPIView):
    required_perms = {"POST": P.ROLE_ASSIGN}

    def get_permissions(self):
        if policy.holds_anywhere(self.request.user, P.VERTICAL_HEAD_ASSIGN):
            self.required_perms = {"POST": P.VERTICAL_HEAD_ASSIGN}
        return super().get_permissions()

    @extend_schema(request=RevokeSerializer, responses=RoleAssignmentSerializer)
    def post(self, request, pk):
        s = RevokeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        assignment = get_object_or_404(RoleAssignment.objects.select_related("user", "role"), pk=pk)
        # Hide assignments outside the actor's view scope (404, not 403 — no existence leak).
        if not policy.has_perm(request.user, P.ROLE_VIEW, assignment):
            services.deny(
                request,
                "role.revoke",
                f"Refused: {request.user.email} tried to revoke an assignment outside their scope.",
                target=assignment,
            )
            return Response({"error": {"code": "not_found", "message": "Not found."}}, status=status.HTTP_404_NOT_FOUND)
        services.revoke_assignment(request, assignment, s.validated_data.get("reason", ""))
        return Response(RoleAssignmentSerializer(assignment).data)
