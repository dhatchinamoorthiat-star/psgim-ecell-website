"""
The policy engine — the one place where "may this user do this?" is decided.

    has_perm(user, "vertical.manage")            # organisation-wide (GLOBAL) check
    has_perm(user, "membership.manage", vertical) # scoped check against an object
    scopes_for(user, "vertical.view")            # for filtering list endpoints

A permission is granted when ALL of these hold for at least one assignment:
  1. the user is active;
  2. the assignment's role carries the permission;
  3. the assignment is in force (not revoked, within starts_at/ends_at);
  4. its academic year, if it has one, is the current year;
  5. its scope contains the target: GLOBAL contains everything, otherwise
     (scope_type, scope_id) must be one of the target's `rbac_scopes()`;
  6. for own_only permissions, the target's `rbac_owner_id()` is the user.

Targets implement `rbac_scopes() -> set[(ScopeType, uuid)]` and optionally
`rbac_owner_id()`. Without a target, only GLOBAL (non-own) grants count —
an object-less check means "across the whole organisation".

Views must not re-implement any of this; they call these functions.
"""

from dataclasses import dataclass, field
from uuid import UUID

from .models import RoleAssignment, RolePermission, ScopeType

_CACHE_ATTR = "_rbac_grants_cache"


@dataclass(frozen=True)
class Grant:
    permission: str
    scope_type: str
    scope_id: UUID | None
    own_only: bool
    role_key: str


@dataclass
class ScopeSet:
    """Where a user holds a permission. `is_global` trumps the id sets."""

    is_global: bool = False
    ids: dict[str, set[UUID]] = field(default_factory=dict)

    def ids_for(self, scope_type: str) -> set[UUID]:
        return self.ids.get(scope_type, set())

    @property
    def any(self) -> bool:
        return self.is_global or any(self.ids.values())


@dataclass(frozen=True)
class ScopeTarget:
    """A bare scope used as a target, e.g. "the Events vertical" when assigning a role there."""

    scope_type: str
    scope_id: UUID | None = None

    def rbac_scopes(self):
        if self.scope_type == ScopeType.GLOBAL:
            return set()  # only GLOBAL grants reach an organisation-wide target
        return {(self.scope_type, self.scope_id)}


def _grants(user) -> list[Grant]:
    if user is None or not getattr(user, "is_authenticated", False) or not user.is_active:
        return []
    cached = getattr(user, _CACHE_ATTR, None)
    if cached is not None:
        return cached

    assignments = list(
        RoleAssignment.objects.in_force().filter(user=user).values("role_id", "role__key", "scope_type", "scope_id")
    )
    role_ids = {a["role_id"] for a in assignments}
    perms_by_role: dict = {}
    for rp in RolePermission.objects.filter(role_id__in=role_ids).values("role_id", "permission_id", "own_only"):
        perms_by_role.setdefault(rp["role_id"], []).append(rp)

    grants = [
        Grant(rp["permission_id"], a["scope_type"], a["scope_id"], rp["own_only"], a["role__key"])
        for a in assignments
        for rp in perms_by_role.get(a["role_id"], [])
    ]
    setattr(user, _CACHE_ATTR, grants)
    return grants


def invalidate(user) -> None:
    """Forget cached grants (call after changing a user's assignments in the same request)."""
    if user is not None and hasattr(user, _CACHE_ATTR):
        delattr(user, _CACHE_ATTR)


def _owner_matches(user, obj) -> bool:
    owner = getattr(obj, "rbac_owner_id", None)
    return obj is not None and owner is not None and owner() == user.id


def has_perm(user, permission: str, obj=None) -> bool:
    target_scopes = set(obj.rbac_scopes()) if obj is not None else set()
    for g in _grants(user):
        if g.permission != permission:
            continue
        if g.own_only and not _owner_matches(user, obj):
            continue
        if g.scope_type == ScopeType.GLOBAL:
            return True
        if obj is not None and (g.scope_type, g.scope_id) in target_scopes:
            return True
    return False


def holds_anywhere(user, permission: str) -> bool:
    """True if the user holds the permission in any scope. A coarse gate, never sufficient alone for a mutation."""
    return any(g.permission == permission for g in _grants(user))


def scopes_for(user, permission: str, *, include_own_only: bool = False) -> ScopeSet:
    result = ScopeSet()
    for g in _grants(user):
        if g.permission != permission or (g.own_only and not include_own_only):
            continue
        if g.scope_type == ScopeType.GLOBAL:
            result.is_global = True
        else:
            result.ids.setdefault(g.scope_type, set()).add(g.scope_id)
    return result


def effective_permissions(user) -> list[dict]:
    """What /auth/me reports, so the UI can predict what to show. Advisory only."""
    seen, out = set(), []
    for g in _grants(user):
        key = (g.permission, g.scope_type, g.scope_id, g.own_only)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "permission": g.permission,
                "scope_type": g.scope_type,
                "scope_id": str(g.scope_id) if g.scope_id else None,
                "own_only": g.own_only,
            }
        )
    return sorted(out, key=lambda p: (p["permission"], p["scope_type"], p["scope_id"] or ""))


def grant_snapshot(user) -> list[dict]:
    """The actor's roles at the moment of an audited action (stored on the audit row)."""
    seen, out = set(), []
    for g in _grants(user):
        key = (g.role_key, g.scope_type, g.scope_id)
        if key not in seen:
            seen.add(key)
            out.append({"role": g.role_key, "scope_type": g.scope_type, "scope_id": str(g.scope_id) if g.scope_id else None})
    return out
