"""
One error shape for the whole API (docs/12_API_CONTRACT.md):

    {"error": {"code": "permission_denied", "message": "...", "fields": {...}}}
"""

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(exceptions.APIException):
    """409 — the request is valid but would break an invariant (e.g. removing the last super admin)."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"
    default_detail = "This change conflicts with the current state."


def _flatten(detail):
    if isinstance(detail, list):
        return [str(d) for d in detail]
    if isinstance(detail, dict):
        return {k: _flatten(v) for k, v in detail.items()}
    return [str(detail)]


def exception_handler(exc, context):
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail
        fields = _flatten(detail) if isinstance(detail, dict) else {"non_field_errors": _flatten(detail)}
        message = "Some fields are invalid."
        code = "validation_error"
    else:
        codes = exc.get_codes() if hasattr(exc, "get_codes") else "error"
        code = codes if isinstance(codes, str) else "error"
        message = str(getattr(exc, "detail", "")) or "Error."
        fields = None

    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    response.data = body
    return response
