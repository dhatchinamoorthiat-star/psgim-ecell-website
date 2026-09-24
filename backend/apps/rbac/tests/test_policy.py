"""Unit tests of the policy engine: each of the five conditions in apps/rbac/policy.py."""

from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.memberships.models import AcademicYear
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.approvals import DuplicateStageApprover, SelfApprovalDenied, check_approval
from apps.rbac.models import ScopeType
from apps.rbac.policy import ScopeTarget
from conftest import grant, make_user

pytestmark = pytest.mark.django_db


def fresh(user):
    policy.invalidate(user)
    return User.objects.get(pk=user.pk)


def test_global_grant_covers_everything(org):
    sa = org["super_admin"]
    assert policy.has_perm(sa, P.VERTICAL_MANAGE)
    assert policy.has_perm(sa, P.MEMBERSHIP_MANAGE, org["vertical_b"])


def test_vertical_grant_covers_only_its_vertical(org):
    head = org["head_a"]
    assert policy.has_perm(head, P.MEMBERSHIP_MANAGE, org["vertical_a"])
    assert not policy.has_perm(head, P.MEMBERSHIP_MANAGE, org["vertical_b"])
    # An object-less check means "organisation-wide" — a scoped head does not have that.
    assert not policy.has_perm(head, P.MEMBERSHIP_MANAGE)
    assert not policy.has_perm(head, P.MEMBERSHIP_MANAGE, ScopeTarget(ScopeType.GLOBAL))


def test_permission_not_in_role_is_never_granted(org):
    assert not policy.has_perm(org["head_a"], P.ROLE_ASSIGN, org["vertical_a"])
    assert not policy.has_perm(org["tech_head"], P.CONTENT_APPROVE)  # principle 1
    assert not policy.has_perm(org["super_admin"], P.CONTENT_APPROVE_FACULTY)  # faculty authority is separate


def test_revoked_expired_and_future_assignments_confer_nothing(db, year, vertical_a):
    now = timezone.now()
    u1, u2, u3 = (make_user(f"u{i}@test.example") for i in range(3))
    grant(u1, "SUPER_ADMIN", revoked_at=now)
    grant(u2, "SUPER_ADMIN", starts_at=now - timedelta(days=10), ends_at=now - timedelta(days=1))
    grant(u3, "SUPER_ADMIN", starts_at=now + timedelta(days=1))
    for u in (u1, u2, u3):
        assert not policy.has_perm(u, P.VERTICAL_MANAGE)


def test_assignment_bound_to_a_past_year_confers_nothing(db, year):
    old = AcademicYear.objects.create(label="2090-91", starts_on=date(2090, 7, 1), ends_on=date(2091, 6, 30))
    u = make_user("old-head@test.example")
    grant(u, "SUPER_ADMIN", academic_year=old)
    assert not policy.has_perm(u, P.VERTICAL_MANAGE)
    grant(u, "ADMIN_HEAD", academic_year=year)
    assert policy.has_perm(fresh(u), P.USER_MANAGE)


def test_inactive_user_holds_nothing(org):
    sa = org["super_admin"]
    sa.status = User.Status.INACTIVE
    sa.save()
    assert not policy.has_perm(fresh(sa), P.VERTICAL_MANAGE)


class _Owned:
    def __init__(self, owner_id, vertical_id):
        self._owner, self._v = owner_id, vertical_id

    def rbac_scopes(self):
        return {(ScopeType.VERTICAL, self._v)}

    def rbac_owner_id(self):
        return self._owner


def test_own_only_permissions_require_ownership(org):
    member = org["member_a"]
    mine = _Owned(member.pk, org["vertical_a"].pk)
    theirs = _Owned(org["head_a"].pk, org["vertical_a"].pk)
    assert policy.has_perm(member, P.BLOG_EDIT, mine)
    assert not policy.has_perm(member, P.BLOG_EDIT, theirs)
    assert not policy.has_perm(member, P.BLOG_EDIT)  # no object, no ownership


def test_scopes_for_lists_scoped_ids(org):
    s = policy.scopes_for(org["head_a"], P.MEMBERSHIP_VIEW)
    assert not s.is_global and s.ids_for(ScopeType.VERTICAL) == {org["vertical_a"].pk}
    assert policy.scopes_for(org["super_admin"], P.MEMBERSHIP_VIEW).is_global


def test_effective_permissions_reports_scope(org):
    perms = policy.effective_permissions(org["head_a"])
    entry = next(p for p in perms if p["permission"] == P.MEMBERSHIP_MANAGE)
    assert entry["scope_type"] == "VERTICAL" and entry["scope_id"] == str(org["vertical_a"].pk)


# --- Approval invariants (docs/07 "Invariants"); content arrives in Phase 2 ---


def test_author_cannot_approve_own_content(org):
    author = org["head_a"]
    with pytest.raises(SelfApprovalDenied) as exc:
        check_approval(author, author_ids=[author.pk])
    assert exc.value.status_code == 403


def test_same_person_cannot_satisfy_two_stages(org):
    with pytest.raises(DuplicateStageApprover):
        check_approval(org["super_admin"], author_ids=[org["head_a"].pk], prior_stage_approver_ids=[org["super_admin"].pk])


def test_distinct_approver_passes(org):
    check_approval(org["super_admin"], author_ids=[org["head_a"].pk])


# --- No role-name checks in application code (principle 9) ---


def test_no_role_name_checks_in_application_code():
    import pathlib
    import re

    root = pathlib.Path(__file__).resolve().parents[2]
    pattern = re.compile(
        r"""(\.key\s*[=!]=|role\s*==|["'](SUPER_ADMIN|ADMIN_HEAD|TECHNICAL_HEAD|PLATFORM_ADMIN|VERTICAL_HEAD|MEMBER|FACULTY_ADVISOR)["'])"""
    )
    offenders = []
    for path in root.rglob("*.py"):
        rel = path.relative_to(root).as_posix()
        # Tests, migrations, the catalogue and dev/seed commands name roles as *data*, not as checks.
        if "/tests/" in rel or "/migrations/" in rel or "/management/commands/" in rel or rel.endswith("catalogue.py"):
            continue
        for n, line in enumerate(path.read_text().splitlines(), 1):
            if pattern.search(line):
                offenders.append(f"{rel}:{n}: {line.strip()}")
    assert not offenders, "Authorization must go through permissions, not role names:\n" + "\n".join(offenders)
