"""
Shared test fixtures.

All organisational data here is test-only: the verticals are named
"Test Vertical A/B", never real E-Cell verticals (their list is gated by N-2).
"""

from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.memberships.models import AcademicYear, Membership
from apps.rbac.management.commands.seed_rbac import seed_rbac
from apps.rbac.models import Role, RoleAssignment, ScopeType
from apps.verticals.models import Vertical

PASSWORD = "correct-horse-battery-staple"


# --- factories --------------------------------------------------------------


def make_user(email: str, *, full_name: str | None = None, password: str = PASSWORD, **fields) -> User:
    return User.objects.create_user(email=email, password=password, full_name=full_name or email.split("@")[0], **fields)


def make_vertical(slug: str, **fields) -> Vertical:
    return Vertical.objects.create(slug=slug, name=fields.pop("name", slug.replace("-", " ").title()), **fields)


def grant(user: User, role_key: str, vertical: Vertical | None = None, **fields) -> RoleAssignment:
    """Create an assignment directly (bypassing the service) — test setup only."""
    return RoleAssignment.objects.create(
        user=user,
        role=Role.objects.get(key=role_key),
        scope_type=ScopeType.VERTICAL if vertical else ScopeType.GLOBAL,
        scope_id=vertical.pk if vertical else None,
        **fields,
    )


def client_for(user: User | None, *, enforce_csrf: bool = False) -> APIClient:
    client = APIClient(enforce_csrf_checks=enforce_csrf)
    if user is not None:
        client.force_login(user)
    return client


# --- fixtures ---------------------------------------------------------------


@pytest.fixture(autouse=True)
def _rbac(db):
    seed_rbac()


@pytest.fixture(autouse=True)
def _clear_cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def year(db) -> AcademicYear:
    return AcademicYear.objects.create(label="2098-99", starts_on=date(2098, 7, 1), ends_on=date(2099, 6, 30), is_current=True)


@pytest.fixture
def vertical_a(db) -> Vertical:
    return make_vertical("test-vertical-a", name="Test Vertical A")


@pytest.fixture
def vertical_b(db) -> Vertical:
    return make_vertical("test-vertical-b", name="Test Vertical B")


@pytest.fixture
def org(db, year, vertical_a, vertical_b):
    """
    A small test organisation:
      super_admin, super_admin_2    SUPER_ADMIN @ GLOBAL
      admin_head                    ADMIN_HEAD  @ GLOBAL
      tech_head                     TECHNICAL_HEAD @ GLOBAL
      head_a                        VERTICAL_HEAD @ vertical A (member of A)
      member_a, member_b            MEMBER @ A / B (members of A / B)
      outsider                      no roles
    """
    users = {
        name: make_user(f"{name}@test.example")
        for name in ["super_admin", "super_admin_2", "admin_head", "tech_head", "head_a", "member_a", "member_b", "outsider"]
    }
    grant(users["super_admin"], "SUPER_ADMIN")
    grant(users["super_admin_2"], "SUPER_ADMIN")
    grant(users["admin_head"], "ADMIN_HEAD")
    grant(users["tech_head"], "TECHNICAL_HEAD")
    grant(users["head_a"], "VERTICAL_HEAD", vertical_a)
    grant(users["member_a"], "MEMBER", vertical_a)
    grant(users["member_b"], "MEMBER", vertical_b)
    for name, v in [("head_a", vertical_a), ("member_a", vertical_a), ("member_b", vertical_b)]:
        Membership.objects.create(user=users[name], vertical=v, academic_year=year)
    users["vertical_a"] = vertical_a
    users["vertical_b"] = vertical_b
    users["year"] = year
    return users
