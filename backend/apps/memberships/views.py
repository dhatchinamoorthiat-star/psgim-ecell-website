from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from apps.accounts.models import User
from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.api import AUTHENTICATED, PermissionedAPIView
from apps.rbac.models import ScopeType
from apps.rbac.services import ensure_governance_remains, governance_holders_after, lock_governance
from apps.verticals.models import Vertical

from .models import AcademicYear, Membership
from .serializers import AcademicYearSerializer, MembershipCreateSerializer, MembershipSerializer


class AcademicYearListView(PermissionedAPIView):
    required_perms = {"GET": AUTHENTICATED, "POST": P.ACADEMIC_YEAR_MANAGE}

    @extend_schema(responses=AcademicYearSerializer(many=True))
    def get(self, request):
        return Response(AcademicYearSerializer(AcademicYear.objects.all(), many=True).data)

    @extend_schema(request=AcademicYearSerializer, responses={201: AcademicYearSerializer})
    def post(self, request):
        self.require(P.ACADEMIC_YEAR_MANAGE)
        s = AcademicYearSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                year = AcademicYear.objects.create(**s.validated_data)
                audit.record(request, "academic_year.create", target=year, summary=f"{request.user.email} created academic year {year.label}.",
                             after=s.data | {"label": year.label})  # fmt: skip
        except IntegrityError as exc:
            raise Conflict("An academic year with that label already exists.") from exc
        return Response(AcademicYearSerializer(year).data, status=status.HTTP_201_CREATED)


class AcademicYearMakeCurrentView(PermissionedAPIView):
    required_perms = {"POST": P.ACADEMIC_YEAR_MANAGE}

    @extend_schema(request=None, responses=AcademicYearSerializer)
    def post(self, request, pk):
        self.require(P.ACADEMIC_YEAR_MANAGE)
        year = AcademicYear.objects.filter(pk=pk).first()
        if year is None:
            raise NotFound()
        with transaction.atomic():
            # Serialise with other governance changes (apps/rbac/services.py).
            lock_governance()
            previous = AcademicYear.objects.select_for_update().filter(is_current=True).first()
            if previous == year:
                raise Conflict("This is already the current academic year.")
            governors_before = governance_holders_after()
            AcademicYear.objects.filter(is_current=True).update(is_current=False)
            year.is_current = True
            year.save(update_fields=["is_current", "updated_at"])
            # Year-bound assignments stop counting once their year is no longer
            # current. Refuse (and roll back) a switch that would leave nobody
            # governing. An organisation with no governor beforehand is not made
            # worse by the switch, so that case is allowed.
            if governors_before > 0:
                ensure_governance_remains()
            audit.record(request, "academic_year.set_current", target=year,
                         summary=f"{request.user.email} made {year.label} the current academic year.",
                         before={"current": previous.label if previous else None}, after={"current": year.label})  # fmt: skip
        return Response(AcademicYearSerializer(year).data)


class MembershipListView(PermissionedAPIView):
    required_perms = {"GET": P.MEMBERSHIP_VIEW, "POST": P.MEMBERSHIP_MANAGE}

    @extend_schema(responses=MembershipSerializer(many=True))
    def get(self, request):
        scopes = policy.scopes_for(request.user, P.MEMBERSHIP_VIEW)
        qs = Membership.objects.select_related("user", "vertical", "academic_year")
        if not scopes.is_global:
            qs = qs.filter(vertical_id__in=scopes.ids_for(ScopeType.VERTICAL))
        for param, field in [
            ("vertical_id", "vertical_id"),
            ("user_id", "user_id"),
            ("academic_year_id", "academic_year_id"),
            ("status", "status"),
        ]:
            if value := request.query_params.get(param):
                qs = qs.filter(**{field: value})
        if request.query_params.get("current") == "true":
            qs = qs.filter(academic_year__is_current=True)
        return self.paginated(qs, MembershipSerializer)

    @extend_schema(request=MembershipCreateSerializer, responses={201: MembershipSerializer})
    def post(self, request):
        s = MembershipCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        vertical = Vertical.objects.filter(pk=d["vertical_id"], is_active=True).first()
        if vertical is None:
            raise ValidationError({"vertical_id": ["No active vertical with this id."]})
        self.require(P.MEMBERSHIP_MANAGE, vertical)
        user = User.objects.filter(pk=d["user_id"], status=User.Status.ACTIVE).first()
        if user is None:
            raise ValidationError({"user_id": ["No active user with this id."]})
        year = (
            AcademicYear.objects.filter(pk=d["academic_year_id"]).first() if d.get("academic_year_id") else AcademicYear.current()
        )
        if year is None:
            raise ValidationError({"academic_year_id": ["No such academic year, and no current year is set."]})
        try:
            with transaction.atomic():
                m = Membership.objects.create(user=user, vertical=vertical, academic_year=year, title=d.get("title", ""),
                                              created_by=request.user)  # fmt: skip
                audit.record(request, "membership.create", target=m,
                             summary=f"{request.user.email} added {user.email} to {vertical.name} ({year.label}).",
                             after={"user": user.email, "vertical": vertical.slug, "academic_year": year.label, "title": m.title})  # fmt: skip
        except IntegrityError as exc:
            raise Conflict("This person is already a member of this vertical for that year.") from exc
        return Response(MembershipSerializer(m).data, status=status.HTTP_201_CREATED)


class MembershipEndView(PermissionedAPIView):
    """Ends a membership. The row is kept — history is never deleted."""

    required_perms = {"POST": P.MEMBERSHIP_MANAGE}

    @extend_schema(request=None, responses=MembershipSerializer)
    def post(self, request, pk):
        m = Membership.objects.select_related("user", "vertical", "academic_year").filter(pk=pk).first()
        if m is None or not policy.has_perm(request.user, P.MEMBERSHIP_VIEW, m):
            raise NotFound()
        self.require(P.MEMBERSHIP_MANAGE, m)
        if m.status == Membership.Status.ENDED:
            raise Conflict("This membership has already ended.")
        with transaction.atomic():
            m.status = Membership.Status.ENDED
            m.left_at = timezone.now()
            m.save(update_fields=["status", "left_at", "updated_at"])
            audit.record(request, "membership.end", target=m,
                         summary=f"{request.user.email} ended {m.user.email}'s membership of {m.vertical.name} ({m.academic_year.label}).",
                         before={"status": "active"}, after={"status": "ended"})  # fmt: skip
        return Response(MembershipSerializer(m).data)
