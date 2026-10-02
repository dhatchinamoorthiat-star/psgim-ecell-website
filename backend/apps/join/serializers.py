from rest_framework import serializers

from .models import JoinSource, JoinSubmission

# A real person needs longer than this to read the form and type an answer.
# Bots post the instant the DOM is parsed.
MIN_FILL_SECONDS = 3


class JoinSubmissionCreateSerializer(serializers.Serializer):
    """
    Validates the public form. Separate from the read serializer because the
    public payload carries two anti-spam fields that are never stored.
    """

    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    programme_or_year = serializers.CharField(max_length=120, trim_whitespace=True)
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True, trim_whitespace=True)
    # Unknown or absent values become DIRECT rather than erroring: a stale or
    # hand-edited link should still submit, just without false attribution.
    source = serializers.CharField(required=False, allow_blank=True)
    # Hidden from real users; only a bot fills it. Named innocuously because
    # "honeypot" in the payload defeats the purpose.
    website = serializers.CharField(required=False, allow_blank=True)
    # Milliseconds the form was on screen before submitting.
    elapsed_ms = serializers.IntegerField(required=False, min_value=0)

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Enter your name.")
        return value.strip()

    def validate_programme_or_year(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Enter your programme or year.")
        return value.strip()

    def validate_source(self, value: str) -> str:
        return value if value in JoinSource.values else JoinSource.DIRECT

    def validate(self, attrs):
        # Both checks fail with the same generic message. Telling a bot which
        # signal caught it just helps it adapt, and a real user can never see
        # either error: the honeypot is hidden and the timer is generous.
        if attrs.get("website"):
            raise serializers.ValidationError("That submission could not be accepted.")
        elapsed = attrs.get("elapsed_ms")
        if elapsed is not None and elapsed < MIN_FILL_SECONDS * 1000:
            raise serializers.ValidationError("That submission could not be accepted.")
        attrs.setdefault("source", JoinSource.DIRECT)
        return attrs


class JoinSubmissionSerializer(serializers.ModelSerializer):
    """Staff-facing read shape (platform Join inbox)."""

    class Meta:
        model = JoinSubmission
        fields = [
            "id",
            "name",
            "email",
            "programme_or_year",
            "message",
            "source",
            "handled",
            "handled_at",
            "created_at",
        ]
        read_only_fields = fields


class JoinSubmissionHandledSerializer(serializers.Serializer):
    handled = serializers.BooleanField()
