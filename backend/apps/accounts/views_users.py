from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.memberships.models import Membership
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.api import PermissionedAPIView
from apps.rbac.models import RoleAssignment, ScopeType
from apps.rbac.services import deny, ensure_governance_remains, lock_governance

from .emails import send_password_reset
from .models import User
from .serializers import UserCreateSerializer, UserSerializer, UserUpdateSerializer
from .sessions import end_all_sessions


def _snapshot(user: User) -> dict:
    return {"email": user.email, "full_name": user.full_name, "status": user.status}


def _holds_privileged_role(user: User) -> bool:
    return RoleAssignment.objects.in_force().filter(user=user, role__is_privileged=True).exists()


class _UserBase(PermissionedAPIView):
    def get_user_or_404(self, pk) -> User:
        """Users outside the actor's view scope answer 404, not 403, so existence does not leak."""
        user = User.objects.filter(pk=pk).first()
        if user is None or not policy.has_perm(self.request.user, P.USER_VIEW, user):
            raise NotFound()
        return user

    def require_manage(self, target: User) -> None:
        self.require(P.USER_MANAGE, target)
        # Admin Heads manage accounts, but not the accounts of people who outrank
        # them — only role.manage (Super Admin) may touch a privileged holder.
        if _holds_privileged_role(target) and not policy.has_perm(self.request.user, P.ROLE_MANAGE):
            deny(
                self.request,
                P.USER_MANAGE,
                f"Refused: {self.request.user.email} tried to change privileged account {target.email}.",
                target=target,
            )
            raise PermissionDenied("Only a Super Admin can change this account.")


class UserListView(_UserBase):
    required_perms = {"GET": P.USER_VIEW, "POST": P.USER_MANAGE}

    @extend_schema(responses=UserSerializer(many=True))
    def get(self, request):
        scopes = policy.scopes_for(request.user, P.USER_VIEW)
        qs = User.objects.all()
        if not scopes.is_global:
            member_ids = Membership.objects.filter(
                vertical_id__in=scopes.ids_for(ScopeType.VERTICAL),
                status=Membership.Status.ACTIVE,
                academic_year__is_current=True,
            ).values("user_id")
            qs = qs.filter(pk__in=member_ids)
        if q := request.query_params.get("q"):
            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        if st := request.query_params.get("status"):
            qs = qs.filter(status=st)
        return self.paginated(qs, UserSerializer)

    @extend_schema(request=UserCreateSerializer, responses={201: UserSerializer})
    def post(self, request):
        self.require(P.USER_MANAGE)  # creating accounts is organisation-wide
        s = UserCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            user = User.objects.create_user(
                email=s.validated_data["email"], full_name=s.validated_data["full_name"], created_by=request.user
            )
            audit.record(request, "user.create", target=user, summary=f"{request.user.email} created account {user.email}.",
                         after=_snapshot(user))  # fmt: skip
        if s.validated_data["send_invite"]:
            send_password_reset(user, invite=True)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(_UserBase):
    required_perms = {"GET": P.USER_VIEW, "PATCH": P.USER_MANAGE}

    @extend_schema(responses=UserSerializer)
    def get(self, request, pk):
        return Response(UserSerializer(self.get_user_or_404(pk)).data)

    @extend_schema(request=UserUpdateSerializer, responses=UserSerializer)
    def patch(self, request, pk):
        user = self.get_user_or_404(pk)
        self.require_manage(user)
        s = UserUpdateSerializer(data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        before = _snapshot(user)
        with transaction.atomic():
            for field, value in s.validated_data.items():
                setattr(user, field, value)
            user.save()
            audit.record(request, "user.update", target=user, summary=f"{request.user.email} edited {user.email}.",
                         before=before, after=_snapshot(user))  # fmt: skip
        return Response(UserSerializer(user).data)


class UserDeactivateView(_UserBase):
    required_perms = {"POST": P.USER_MANAGE}

    @extend_schema(request=None, responses=UserSerializer)
    def post(self, request, pk):
        user = self.get_user_or_404(pk)
        if user.pk == request.user.pk:
            deny(request, "user.deactivate", f"Refused: {user.email} tried to deactivate themselves.", target=user)
            raise PermissionDenied("You cannot deactivate your own account.")
        self.require_manage(user)
        before = _snapshot(user)
        with transaction.atomic():
            # Same lock as role revocation: two Super Admins deactivating each
            # other at once are serialised, and the second re-check sees the
            # first's commit (review finding F6).
            lock_governance()
            user = User.objects.select_for_update().get(pk=user.pk)
            if user.status != User.Status.ACTIVE:
                raise Conflict("This account is not active.")
            if policy.has_perm(user, P.ROLE_MANAGE):
                ensure_governance_remains(excluding_user=user)
            user.status = User.Status.INACTIVE
            user.deactivated_at = timezone.now()
            user.deactivated_by = request.user
            user.save()
            ended = end_all_sessions(user)
            audit.record(request, "user.deactivate", target=user,
                         summary=f"{request.user.email} deactivated {user.email}; {ended} session(s) ended.",
                         before=before, after=_snapshot(user))  # fmt: skip
        return Response(UserSerializer(user).data)


class UserReactivateView(_UserBase):
    required_perms = {"POST": P.USER_MANAGE}

    @extend_schema(request=None, responses=UserSerializer)
    def post(self, request, pk):
        user = self.get_user_or_404(pk)
        self.require_manage(user)
        if user.status == User.Status.ACTIVE:
            raise Conflict("This account is already active.")
        before = _snapshot(user)
        with transaction.atomic():
            user.status = User.Status.ACTIVE
            user.deactivated_at = None
            user.deactivated_by = None
            user.save()
            audit.record(request, "user.reactivate", target=user, summary=f"{request.user.email} reactivated {user.email}.",
                         before=before, after=_snapshot(user))  # fmt: skip
        return Response(UserSerializer(user).data)
