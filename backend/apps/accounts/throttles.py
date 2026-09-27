from rest_framework.throttling import SimpleRateThrottle

from apps.core.net import client_ip

from .models import normalize_email


class _IpThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": client_ip(request) or "unknown"}


class LoginThrottle(SimpleRateThrottle):
    """5/min per (IP, email) pair — stops password guessing without letting one attacker lock out a user everywhere."""

    scope = "login"

    def get_cache_key(self, request, view):
        email = normalize_email(str(request.data.get("email", "")))[:254]
        return self.cache_format % {"scope": self.scope, "ident": f"{client_ip(request)}|{email}"}


class PasswordForgotThrottle(_IpThrottle):
    scope = "password_forgot"


class PasswordResetThrottle(_IpThrottle):
    scope = "password_reset"
