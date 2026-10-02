from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import service as audit
from apps.core.net import client_ip
from apps.rbac import catalogue as P
from apps.rbac.api import PermissionedAPIView

from .emails import notify_new_submission_async
from .models import JoinSubmission
from .privacy import hash_ip
from .serializers import (
    JoinSubmissionCreateSerializer,
    JoinSubmissionHandledSerializer,
    JoinSubmissionSerializer,
)
from .throttles import JoinSubmitThrottle

ACCEPTED_RESPONSE = {"status": "accepted"}


@method_decorator(csrf_protect, name="dispatch")
class JoinSubmitView(APIView):
    """
    Public membership-interest endpoint.

    Mirrors PasswordForgotView (apps/accounts/views_auth.py): AllowAny plus an
    explicit csrf_protect, because SessionAuthentication only enforces CSRF for
    already-authenticated sessions and this caller has no session at all.
    """

    public = True  # declared for the URL-coverage test
    permission_classes = [AllowAny]
    throttle_classes = [JoinSubmitThrottle]

    @extend_schema(request=JoinSubmissionCreateSerializer, responses={202: dict})
    def post(self, request):
        s = JoinSubmissionCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        submission = JoinSubmission.objects.create(
            name=data["name"],
            email=data["email"],
            programme_or_year=data["programme_or_year"],
            message=data.get("message", ""),
            source=data["source"],
            ip_hash=hash_ip(client_ip(request)),
        )

        # Neither the summary nor the audit payload carries the visitor's
        # message: the audit log is read by more people than the inbox is.
        audit.record(
            request,
            "join.submission_created",
            summary=f"Membership interest submitted from {submission.source}.",
            target=submission,
            actor=None,
        )
        notify_new_submission_async(submission)
        return Response(ACCEPTED_RESPONSE, status=status.HTTP_202_ACCEPTED)


class JoinSubmissionListView(PermissionedAPIView):
    required_perms = {"GET": P.JOIN_SUBMISSION_MANAGE}

    @extend_schema(responses=JoinSubmissionSerializer(many=True))
    def get(self, request):
        qs = JoinSubmission.objects.all()
        handled = request.query_params.get("handled")
        if handled in {"true", "false"}:
            qs = qs.filter(handled=(handled == "true"))
        return self.paginated(qs, JoinSubmissionSerializer)


class JoinSubmissionHandledView(PermissionedAPIView):
    required_perms = {"POST": P.JOIN_SUBMISSION_MANAGE}

    @extend_schema(request=JoinSubmissionHandledSerializer, responses={200: JoinSubmissionSerializer})
    def post(self, request, pk):
        submission = JoinSubmission.objects.filter(pk=pk).first()
        if submission is None:
            raise NotFound("No such submission.")
        s = JoinSubmissionHandledSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        handled = s.validated_data["handled"]
        submission.handled = handled
        submission.handled_at = timezone.now() if handled else None
        submission.save(update_fields=["handled", "handled_at", "updated_at"])

        audit.record(
            request,
            "join.submission_handled" if handled else "join.submission_unhandled",
            summary=f"Membership-interest submission marked {'handled' if handled else 'unhandled'}.",
            target=submission,
        )
        return Response(JoinSubmissionSerializer(submission).data)
