import logging

from django.conf import settings
from django.db import DatabaseError, connection, transaction
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework import serializers
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import service as audit
from apps.rbac import catalogue as P
from apps.rbac.api import PermissionedAPIView

from .models import OrganizationSettings, validate_timezone

logger = logging.getLogger(__name__)


def csrf_failure(request, reason=""):
    """CSRF rejections in the API's own error shape, instead of Django's HTML page."""
    return JsonResponse(
        {"error": {"code": "csrf_failed", "message": "CSRF verification failed. Fetch /api/v1/auth/csrf and retry."}},
        status=403,
    )


class HealthView(APIView):
    """
    Liveness + database reachability for the host's health check and for the
    post-deploy checklist (docs/28_A2_DEPLOYMENT_RUNBOOK.md).

    Public, unauthenticated, and deliberately uninformative: it reports only
    "ok" or "unavailable" — no version, host, database name or error text,
    so it tells an outsider nothing an attacker could use. It never touches
    the session (no authentication classes), so a probe cannot create
    sessions or need a CSRF token, and it is never cached.

    Exempt from SECURE_SSL_REDIRECT in production (config/settings/prod.py),
    because a host's internal health probe may arrive over plain HTTP.
    """

    public = True  # declared for the URL-coverage test
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(
        responses={
            200: inline_serializer("Health", {"status": serializers.CharField(), "database": serializers.CharField()}),
            503: inline_serializer("HealthUnavailable", {"status": serializers.CharField(), "database": serializers.CharField()}),
        }
    )
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except DatabaseError as exc:
            # Class name only: driver messages can name hosts and users.
            logger.warning("Health check: database unavailable (%s)", type(exc).__name__)
            body, code = {"status": "error", "database": "unavailable"}, 503
        else:
            body, code = {"status": "ok", "database": "ok"}, 200
        return Response(body, status=code, headers={"Cache-Control": "no-store"})


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
