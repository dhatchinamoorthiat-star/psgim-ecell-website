from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework import serializers
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.audit import service as audit
from apps.rbac import catalogue as P
from apps.rbac.api import PermissionedAPIView

from .models import OrganizationSettings, validate_timezone


def csrf_failure(request, reason=""):
    """CSRF rejections in the API's own error shape, instead of Django's HTML page."""
    return JsonResponse(
        {"error": {"code": "csrf_failed", "message": "CSRF verification failed. Fetch /api/v1/auth/csrf and retry."}},
        status=403,
    )


class _DocsPermission(BasePermission):
    """The generated schema is public in development only (settings.API_DOCS_PUBLIC)."""

    def has_permission(self, request, view):
        return settings.API_DOCS_PUBLIC or (request.user and request.user.is_authenticated)


class SchemaView(SpectacularAPIView):
    public = True  # gated by _DocsPermission rather than an RBAC permission
    permission_classes = [_DocsPermission]


class SwaggerView(SpectacularSwaggerView):
    public = True
    permission_classes = [_DocsPermission]


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    timezone = serializers.CharField(validators=[validate_timezone])

    class Meta:
        model = OrganizationSettings
        fields = ["name", "timezone", "updated_at"]
        read_only_fields = ["updated_at"]


class OrganizationSettingsView(PermissionedAPIView):
    required_perms = {"GET": P.SYSTEM_SETTINGS, "PATCH": P.SYSTEM_SETTINGS}

    @extend_schema(responses=OrganizationSettingsSerializer)
    def get(self, request):
        self.require(P.SYSTEM_SETTINGS)
        return Response(OrganizationSettingsSerializer(OrganizationSettings.load()).data)

    @extend_schema(request=OrganizationSettingsSerializer, responses=OrganizationSettingsSerializer)
    def patch(self, request):
        self.require(P.SYSTEM_SETTINGS)
        org = OrganizationSettings.load()
        before = {"name": org.name, "timezone": org.timezone}
        s = OrganizationSettingsSerializer(org, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            s.save()
            audit.record(request, "system.settings_update", target=org, summary=f"{request.user.email} changed organisation settings.",
                         before=before, after={"name": org.name, "timezone": org.timezone})  # fmt: skip
        return Response(s.data)
