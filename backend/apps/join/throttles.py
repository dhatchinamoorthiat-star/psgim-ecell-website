from rest_framework.throttling import SimpleRateThrottle

from apps.core.net import client_ip


class JoinSubmitThrottle(SimpleRateThrottle):
    """
    Per-IP cap on interest submissions.

    Keyed on IP alone (not IP+email, as login is): the abuse here is flooding
    the inbox from one source, and bucketing by email would let a script send
    unlimited submissions just by varying the address.
    """

    scope = "join_submit"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": client_ip(request) or "unknown"}
