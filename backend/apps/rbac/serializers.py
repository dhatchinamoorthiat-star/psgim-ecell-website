from rest_framework import serializers

from .models import Permission, Role, RoleAssignment, ScopeType


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["code", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    assign_permission = serializers.CharField(source="assign_permission_id", read_only=True)

    class Meta:
        model = Role
        fields = ["id", "key", "name", "description", "is_system", "is_privileged", "assign_permission", "permissions"]

    def get_permissions(self, role) -> list[dict]:
        return [
            {"code": rp.permission_id, "own_only": rp.own_only}
            for rp in sorted(role.rolepermission_set.all(), key=lambda rp: rp.permission_id)
        ]


class _UserRef(serializers.Serializer):
    id = serializers.UUIDField()
    email = serializers.EmailField()
    full_name = serializers.CharField()


class RoleAssignmentSerializer(serializers.ModelSerializer):
    user = _UserRef(read_only=True)
    role = serializers.SlugRelatedField(slug_field="key", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    assigned_by = serializers.EmailField(source="assigned_by.email", read_only=True, default=None)
    revoked_by = serializers.EmailField(source="revoked_by.email", read_only=True, default=None)
    academic_year = serializers.CharField(source="academic_year.label", read_only=True, default=None)

    class Meta:
        model = RoleAssignment
        fields = [
            "id", "user", "role", "role_name", "scope_type", "scope_id", "academic_year", "starts_at", "ends_at",
            "note", "assigned_by", "created_at", "revoked_at", "revoked_by",
        ]  # fmt: skip


class RoleAssignmentCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    role = serializers.SlugRelatedField(slug_field="key", queryset=Role.objects.all())
    scope_type = serializers.ChoiceField(choices=ScopeType.choices)
    scope_id = serializers.UUIDField(required=False, allow_null=True)
    academic_year_id = serializers.UUIDField(required=False, allow_null=True)
    ends_at = serializers.DateTimeField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class RevokeSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=300)
