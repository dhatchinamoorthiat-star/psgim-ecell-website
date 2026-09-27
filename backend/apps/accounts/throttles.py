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


class LoginIpThrottle(_IpThrottle):
    """
    20/min per IP regardless of the email tried (review finding F3).

    LoginThrottle alone buckets by (IP, email), so one attacker can spray
    unlimited different email addresses from a single IP without ever
    tripping it. This bucket closes that gap.

    Rate: 20/min. LoginThrottle already caps genuine guessing at 5/min per
    account, so 20/min per IP still allows four full accounts' worth of
    attempts a minute from one address — generous enough that a shared
    network (a hostel or lab NAT with several students signing in around
    the same time) is not blocked by normal use, while capping how many
    distinct accounts one IP can probe per minute.
    """

    scope = "login_ip"


class PasswordForgotThrottle(_IpThrottle):
    scope = "password_forgot"


class PasswordResetThrottle(_IpThrottle):
    scope = "password_reset"
