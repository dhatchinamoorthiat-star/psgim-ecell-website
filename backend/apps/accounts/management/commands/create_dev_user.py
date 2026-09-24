from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.rbac.models import Role, RoleAssignment, ScopeType
from apps.verticals.models import Vertical


class Command(BaseCommand):
    help = "DEVELOPMENT ONLY: create a user (optionally with a role) so you can sign in locally."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--name", default="Dev User")
        parser.add_argument("--role", help="System role key, e.g. SUPER_ADMIN or VERTICAL_HEAD")
        parser.add_argument("--vertical", help="Vertical slug, for vertical-scoped roles")

    def handle(self, *args, email, password, name, role, vertical, **options):
        if not settings.DEBUG:
            raise CommandError("create_dev_user only runs with DEBUG=True. Real accounts are created in the platform.")
        user = User.objects.filter(email=email.strip().lower()).first()
        if user is None:
            user = User.objects.create_user(email=email, password=password, full_name=name)
            self.stdout.write(f"Created {user.email}")
        else:
            user.set_password(password)
            user.save()
            self.stdout.write(f"Updated password for {user.email}")
        if role:
            role_obj = Role.objects.filter(key=role).first()
            if role_obj is None:
                raise CommandError(f"Unknown role {role!r}. Did you run seed_rbac?")
            scope_type, scope_id = ScopeType.GLOBAL, None
            if vertical:
                v = Vertical.objects.filter(slug=vertical).first()
                if v is None:
                    raise CommandError(f"No vertical with slug {vertical!r}.")
                scope_type, scope_id = ScopeType.VERTICAL, v.pk
            RoleAssignment.objects.get_or_create(
                user=user, role=role_obj, scope_type=scope_type, scope_id=scope_id, revoked_at=None,
                defaults={"note": "create_dev_user (development only)"},
            )  # fmt: skip
            self.stdout.write(f"Granted {role} @ {scope_type}{f':{vertical}' if vertical else ''}")
