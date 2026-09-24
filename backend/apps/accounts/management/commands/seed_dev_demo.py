from datetime import date

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from apps.memberships.models import AcademicYear, Membership
from apps.verticals.models import Vertical

DEMO_PASSWORD = "demo-password-123"


class Command(BaseCommand):
    """
    DEVELOPMENT ONLY. Creates an obviously fake organisation for clicking
    around the platform: "Demo Vertical A/B" and one user per role
    (<role>@demo.local). These are NOT the E-Cell's verticals — the real list
    is gated by N-2 in docs/PHASE_1_AUTHORIZATION.md.
    """

    help = "DEVELOPMENT ONLY: create demo verticals and one demo user per role."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_dev_demo only runs with DEBUG=True.")
        call_command("seed_rbac")
        year, _ = AcademicYear.objects.get_or_create(
            label="DEMO-YEAR", defaults={"starts_on": date(2000, 1, 1), "ends_on": date(2999, 12, 31)}
        )
        if not AcademicYear.objects.filter(is_current=True).exists():
            year.is_current = True
            year.save()
        a, _ = Vertical.objects.get_or_create(
            slug="demo-a", defaults={"name": "Demo Vertical A", "description": "Development demo data"}
        )
        b, _ = Vertical.objects.get_or_create(
            slug="demo-b", defaults={"name": "Demo Vertical B", "description": "Development demo data"}
        )
        people = [
            ("super_admin", "SUPER_ADMIN", None),
            ("admin_head", "ADMIN_HEAD", None),
            ("tech_head", "TECHNICAL_HEAD", None),
            ("head_a", "VERTICAL_HEAD", a),
            ("member_a", "MEMBER", a),
            ("member_b", "MEMBER", b),
        ]
        for local, role, vertical in people:
            args = [
                "--email",
                f"{local}@demo.local",
                "--password",
                DEMO_PASSWORD,
                "--name",
                local.replace("_", " ").title(),
                "--role",
                role,
            ]
            if vertical:
                args += ["--vertical", vertical.slug]
            call_command("create_dev_user", *args, stdout=self.stdout)
            if vertical:
                from apps.accounts.models import User

                Membership.objects.get_or_create(
                    user=User.objects.get(email=f"{local}@demo.local"), vertical=vertical, academic_year=year
                )
        self.stdout.write(self.style.SUCCESS(f"Demo ready. Sign in as <role>@demo.local with password {DEMO_PASSWORD!r}."))
