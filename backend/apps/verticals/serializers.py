from rest_framework import serializers

from .models import Vertical


class VerticalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vertical
        fields = [
            "id", "slug", "name", "description", "display_order", "is_active", "archived_at",
            "is_platform_custodian", "created_at", "updated_at",
        ]  # fmt: skip
        read_only_fields = ["id", "is_active", "archived_at", "created_at", "updated_at"]


class VerticalArchiveSerializer(serializers.Serializer):
    confirm = serializers.CharField(help_text="Type the vertical's slug to confirm.")
