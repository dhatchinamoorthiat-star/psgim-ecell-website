from rest_framework import serializers

from .models import AcademicYear, Membership


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ["id", "label", "starts_on", "ends_on", "is_current", "created_at"]
        read_only_fields = ["id", "is_current", "created_at"]

    def validate(self, data):
        if data["ends_on"] <= data["starts_on"]:
            raise serializers.ValidationError({"ends_on": ["Must be after starts_on."]})
        return data


class MembershipSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    vertical = serializers.SerializerMethodField()
    academic_year = serializers.CharField(source="academic_year.label", read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "vertical", "academic_year", "title", "status", "joined_at", "left_at"]

    def get_user(self, m) -> dict:
        return {"id": str(m.user_id), "email": m.user.email, "full_name": m.user.full_name}

    def get_vertical(self, m) -> dict:
        return {"id": str(m.vertical_id), "slug": m.vertical.slug, "name": m.vertical.name}


class MembershipCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    vertical_id = serializers.UUIDField()
    academic_year_id = serializers.UUIDField(required=False, help_text="Defaults to the current academic year.")
    title = serializers.CharField(required=False, allow_blank=True, max_length=120)
