from django.db import models

from apps.core.models import TimeStampedModel


class JoinSource(models.TextChoices):
    """
    Where the visitor came from. A closed set, because `source` arrives in a
    query string: anything unrecognised is stored as DIRECT rather than
    persisting arbitrary caller-supplied text.
    """

    DIRECT = "direct"
    NAVBAR = "navbar"
    HOME = "home"
    ABOUT = "about"
    NEC = "nec"


class JoinSubmission(TimeStampedModel):
    """
    A public expression of interest in joining the Cell.

    Deliberately NOT a Membership: that model is an authenticated user's
    year-bound place in a vertical, i.e. the internal record of someone who
    already belongs. This is an unauthenticated stranger saying "I'm
    interested", and carries no decision, status or vertical.

    It records only what the form asks. Eligibility, acceptance, vertical
    assignment and recruitment policy are institutional decisions that have
    not been made, so no field anticipates them.
    """

    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254)
    programme_or_year = models.CharField(max_length=120)
    message = models.TextField(max_length=2000, blank=True)
    source = models.CharField(max_length=20, choices=JoinSource.choices, default=JoinSource.DIRECT)
    handled = models.BooleanField(default=False)
    handled_at = models.DateTimeField(null=True, blank=True)
    # Salted hash, never the address itself: enough to spot repeat submissions
    # without storing a visitor's IP. See apps/join/privacy.py.
    ip_hash = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["handled", "-created_at"]),
            models.Index(fields=["email"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(handled=False, handled_at__isnull=True)
                | models.Q(handled=True, handled_at__isnull=False),
                name="join_submission_handled_matches_handled_at",
            ),
        ]

    def __str__(self):
        return f"{self.name} <{self.email}>"
