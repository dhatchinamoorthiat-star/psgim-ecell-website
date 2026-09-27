"""
Authentication endpoints (docs/12_API_CONTRACT.md, "Auth").

Every endpoint that changes state is CSRF-protected, *including* the
anonymous ones (login, forgot, reset). DRF only enforces CSRF for
already-authenticated sessions, so these views add `csrf_protect` themselves.
"""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import service as audit
from apps.audit.models import AuditLog
from apps.core.models import OrganizationSettings
from apps.rbac import policy
from apps.rbac.api import AUTHENTICATED, PermissionedAPIView

from .emails import send_password_reset_async
from .models import User, normalize_email
from .serializers import ForgotSerializer, LoginSerializer, MeSerializer, ResetSerializer, validate_new_password
from .sessions import end_all_sessions
from .throttles import LoginIpThrottle, LoginThrottle, PasswordForgotThrottle, PasswordResetThrottle

FORGOT_RESPONSE = {"detail": "If an account exists for that address, a reset link is on its way."}


def me_payload(user) -> dict:
    org = OrganizationSettings.load()
    return {
        "user": MeSerializer(user).data,
        "permissions": policy.effective_permissions(user),
        "organization": {"name": org.name, "timezone": org.timezone},
    }


def _error(code: str, message: str, http=status.HTTP_400_BAD_REQUEST):
    return Response({"error": {"code": code, "message": message}}, status=http)


class _PublicView(APIView):
    public = True  # declared for the URL-coverage test
    permission_classes = [AllowAny]


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(_PublicView):
    """Sets the `csrftoken` cookie and returns the token. Angular sends it back as X-CSRFToken."""

    @extend_schema(responses=inline_serializer("Csrf", {"csrf_token": serializers.CharField()}))
    def get(self, request):
        from django.middleware.csrf import get_token

        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(_PublicView):
    throttle_classes = [LoginThrottle, LoginIpThrottle]

    @extend_schema(request=LoginSerializer, responses={200: dict})
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = normalize_email(s.validated_data["email"])
        user = authenticate(request, email=email, password=s.validated_data["password"])
        if user is None:
            # Same answer for unknown email, wrong password and inactive account.
            audit.record(request, "auth.login_failed", summary=f"Failed sign-in for {email}.",
                         target_type="accounts.user", result=AuditLog.Result.DENIED)  # fmt: skip
            return _error("invalid_credentials", "Email or password is incorrect.")
        login(request, user)  # rotates the session key and the CSRF token
        audit.record(request, "auth.login", summary=f"{user.email} signed in.", target=user, actor=user)
        return Response(me_payload(user))


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(PermissionedAPIView):
    required_perms = {"POST": AUTHENTICATED}

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        user = request.user
        audit.record(request, "auth.logout", summary=f"{user.email} signed out.", target=user)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(PermissionedAPIView):
    required_perms = {"GET": AUTHENTICATED}

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response(me_payload(request.user))


@method_decorator(csrf_protect, name="dispatch")
class PasswordForgotView(_PublicView):
    throttle_classes = [PasswordForgotThrottle]

    @extend_schema(request=ForgotSerializer, responses={202: dict})
    def post(self, request):
        s = ForgotSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.filter(email=normalize_email(s.validated_data["email"])).first()
        if user is not None and user.is_active:
            # Sent on a background thread (F5): the response must not wait on
            # SMTP I/O, or its latency reveals whether the account exists.
            send_password_reset_async(user)
            audit.record(request, "auth.password_reset_requested", summary=f"Password reset requested for {user.email}.",
                         target=user, actor=None)  # fmt: skip
        # Identical response either way: this endpoint must never reveal who has an account.
        return Response(FORGOT_RESPONSE, status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetView(_PublicView):
    throttle_classes = [PasswordResetThrottle]

    @extend_schema(request=ResetSerializer, responses={200: dict})
    def post(self, request):
        s = ResetSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(s.validated_data["uid"])))
        except Exception:  # malformed uid or unknown user — same answer as a bad token
            user = None
        if user is None or not user.is_active or not default_token_generator.check_token(user, s.validated_data["token"]):
            return _error("invalid_token", "This reset link is invalid or has expired. Request a new one.")

        validate_new_password(s.validated_data["new_password"], user)
        with transaction.atomic():
            user.set_password(s.validated_data["new_password"])
            if user.email_verified_at is None:
                user.email_verified_at = timezone.now()  # they proved they read this mailbox
            user.save()
            ended = end_all_sessions(user)
            audit.record(request, "auth.password_reset", summary=f"{user.email} reset their password; {ended} session(s) ended.",
                         target=user, actor=user)  # fmt: skip
        return Response({"detail": "Password updated. Sign in with your new password."})
