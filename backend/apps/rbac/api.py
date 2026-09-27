"""
Base class for every non-public API view.

Each view declares `required_perms`: HTTP method -> permission code, or the
sentinel AUTHENTICATED for endpoints any signed-in user may call. A test
(`apps/core/tests/test_url_coverage.py`) fails if any /api/v1 view lacks a
declaration, so nothing can be accidentally left open.

The declared permission is a *coarse gate* — the user must hold it in some
scope. Views then call `self.require(perm, obj)` for the precise scoped
decision, or filter querysets with `policy.scopes_for`. Both go through the
policy engine; views never inspect roles.
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from apps.core.pagination import PagePagination

from . import policy
from .services import deny

AUTHENTICATED = "__authenticated__"


class DeclaredPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        perm = view.required_perms.get(request.method, view.required_perms.get("*"))
        if perm is None:
            return False  # undeclared method: refuse rather than guess
        if perm == AUTHENTICATED:
            return True
        if policy.holds_anywhere(request.user, perm):
            return True
        if request.method not in permissions.SAFE_METHODS:
            deny(request, perm, f"Refused: {request.user.email} lacks {perm} ({request.method} {request.path}).",
                 target_type="endpoint", target_id=request.path)  # fmt: skip
        return False


class PermissionedAPIView(APIView):
    required_perms: dict[str, str] = {}
    permission_classes = [DeclaredPermission]

    def paginated(self, queryset, serializer_class):
        paginator = PagePagination()
        page = paginator.paginate_queryset(queryset, self.request, view=self)
        return paginator.get_paginated_response(serializer_class(page, many=True).data)

    def require(self, perm: str, obj=None, *, audit_denial: bool | None = None) -> None:
        """Raise 403 unless the policy engine grants `perm` (on `obj`, if given)."""
        if policy.has_perm(self.request.user, perm, obj):
            return
        if audit_denial if audit_denial is not None else self.request.method not in permissions.SAFE_METHODS:
            deny(
                self.request, perm, f"Refused: {self.request.user.email} lacks {perm} on this target.",
                target=obj if hasattr(obj, "_meta") else None,
                target_type="" if hasattr(obj, "_meta") else "scope",
            )  # fmt: skip
        raise PermissionDenied()
