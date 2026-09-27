"""
Invariant (review finding F8): user deletion is not supported anywhere in
the application. Accounts are deactivated (apps.accounts.views_users.
UserDeactivateView), never removed — deletion would either cascade and
destroy audit rows that reference the user (rbac.RoleAssignment,
audit.AuditLog.actor) or, since those foreign keys are SET_NULL/PROTECT-safe
by design, silently orphan audit history from its actor. Neither is
acceptable, so the capability is deliberately absent rather than guarded.

If a future change adds a delete path, it must keep audit rows intact
(AuditLog.actor is already SET_NULL, so the row survives) and update this
test rather than deleting it.
"""

import uuid

import pytest

from conftest import client_for

pytestmark = pytest.mark.django_db


def test_no_delete_method_on_user_detail_endpoint(org):
    # DELETE is undeclared in UserDetailView.required_perms, so the coarse
    # gate refuses it outright (403) before Django ever gets a chance to
    # answer 405 — see review finding F10 (undeclared methods -> 403, a
    # known, deliberate divergence from HTTP semantics; not this gate).
    r = client_for(org["super_admin"]).delete(f"/api/v1/users/{org['member_a'].pk}")
    assert r.status_code == 403


def test_no_user_delete_route_exists():
    from django.urls import Resolver404, resolve

    for path in ["/api/v1/users/delete", f"/api/v1/users/{uuid.uuid4()}/delete"]:
        with pytest.raises(Resolver404):
            resolve(path)


def test_deactivation_is_the_only_lifecycle_removal_path(org):
    target = org["member_a"]
    r = client_for(org["super_admin"]).post(f"/api/v1/users/{target.pk}/deactivate")
    assert r.status_code == 200
    target.refresh_from_db()
    assert target.status == "inactive"  # the row still exists; nothing is deleted
