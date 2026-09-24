from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User, normalize_email


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, max_length=512)


class ForgotSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=100)
    token = serializers.CharField(max_length=200)
    new_password = serializers.CharField(trim_whitespace=False, max_length=512)


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "status", "email_verified_at"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "status", "email_verified_at", "created_at", "updated_at",
            "last_login", "deactivated_at",
        ]  # fmt: skip
        read_only_fields = fields


class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    send_invite = serializers.BooleanField(default=True)

    def validate_email(self, value):
        value = normalize_email(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value


class UserUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200)


def validate_new_password(password: str, user) -> None:
    try:
        password_validation.validate_password(password, user)
    except Exception as exc:  # django.core.exceptions.ValidationError
        raise serializers.ValidationError({"new_password": list(getattr(exc, "messages", [str(exc)]))}) from exc
