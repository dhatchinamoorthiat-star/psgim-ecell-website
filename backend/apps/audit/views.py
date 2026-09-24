from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import CursorPagination

from apps.rbac import catalogue as P
from apps.rbac.api import PermissionedAPIView

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "at", "actor", "actor_email", "actor_grants", "action", "target_type", "target_id", "summary",
            "before", "after", "result", "ip", "user_agent", "request_id",
        ]  # fmt: skip


class AuditCursor(CursorPagination):
    ordering = ("-at", "-id")
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AuditLogListView(PermissionedAPIView):
    """Read-only. Filters: action (prefix), actor_id, actor_email, result, target_type, target_id, since, until, q."""

    required_perms = {"GET": P.AUDIT_VIEW}

    @extend_schema(responses=AuditLogSerializer(many=True))
    def get(self, request):
        self.require(P.AUDIT_VIEW, audit_denial=True)  # organisation-wide only
        qs = AuditLog.objects.all()
        p = request.query_params
        if v := p.get("action"):
            qs = qs.filter(action__startswith=v)
        if v := p.get("actor_id"):
            qs = qs.filter(actor_id=v)
        if v := p.get("actor_email"):
            qs = qs.filter(actor_email__icontains=v)
        if v := p.get("result"):
            qs = qs.filter(result=v)
        if v := p.get("target_type"):
            qs = qs.filter(target_type=v)
        if v := p.get("target_id"):
            qs = qs.filter(target_id=v)
        if v := p.get("q"):
            qs = qs.filter(summary__icontains=v)
        for name, lookup in (("since", "at__gte"), ("until", "at__lt")):
            if v := p.get(name):
                dt = parse_datetime(v)
                if dt is None:
                    raise ValidationError({name: ["Use an ISO 8601 timestamp."]})
                qs = qs.filter(**{lookup: dt})
        paginator = AuditCursor()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)
