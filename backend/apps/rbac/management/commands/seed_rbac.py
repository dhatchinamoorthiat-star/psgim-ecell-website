from django.core.management.base import BaseCommand
from django.db import transaction

from apps.rbac.catalogue import PERMISSIONS, ROLE_ASSIGN, SYSTEM_ROLES
from apps.rbac.models import Permission, Role, RolePermission


def seed_rbac() -> tuple[int, int]:
    """
    Write the permission catalogue and system roles to the database.

    Idempotent. Keeps system roles exactly in step with catalogue.py (adds
    and removes role permissions). Never creates users or assignments, and
    never creates verticals — the organisation's real structure is gated by
    N-2 / N-5 in docs/PHASE_1_AUTHORIZATION.md.
    """
    with transaction.atomic():
        for code, description in PERMISSIONS.items():
            Permission.objects.update_or_create(code=code, defaults={"description": description})
        Permission.objects.exclude(code__in=PERMISSIONS).filter(rolepermission__isnull=True).delete()

        for key, spec in SYSTEM_ROLES.items():
            role, _ = Role.objects.update_or_create(
                key=key,
                defaults={
                    "name": spec["name"],
                    "description": spec["description"],
                    "is_system": True,
                    "is_privileged": spec["is_privileged"],
                    "assign_permission_id": spec.get("assign_permission", ROLE_ASSIGN),
                },
            )
            wanted = {code: False for code in spec["permissions"]} | {code: True for code in spec["own_only"]}
            RolePermission.objects.filter(role=role).exclude(permission_id__in=wanted).delete()
            for code, own_only in wanted.items():
                RolePermission.objects.update_or_create(role=role, permission_id=code, defaults={"own_only": own_only})
    return len(PERMISSIONS), len(SYSTEM_ROLES)


class Command(BaseCommand):
    help = "Create/refresh the permission catalogue and the system roles. Safe to re-run."

    def handle(self, *args, **options):
        perms, roles = seed_rbac()
        self.stdout.write(self.style.SUCCESS(f"RBAC seeded: {perms} permissions, {roles} system roles."))
