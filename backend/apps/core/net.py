import hmac

from django.conf import settings

# Header the Cloudflare Pages Function attaches to every request it forwards
# (review finding F4). Fixed name: only the trust decision is configurable
# (PROXY_SHARED_SECRET), not what the header is called.
_PROXY_SECRET_META_KEY = "HTTP_X_ECELL_PROXY_SECRET"


def _proxy_secret_is_valid(request) -> bool:
    """
    True only when PROXY_SHARED_SECRET is configured AND the request carries
    a matching value. The backend is directly reachable (Render gives it a
    public URL), so without this check anyone could set CF-Connecting-IP (or
    whatever CLIENT_IP_HEADER names) themselves and spoof their address for
    rate limiting and the audit log. No secret configured -> always False:
    the trust decision fails closed, not open.
    """
    secret = settings.PROXY_SHARED_SECRET
    if not secret:
        return False
    provided = request.META.get(_PROXY_SECRET_META_KEY, "")
    return bool(provided) and hmac.compare_digest(provided, secret)


def client_ip(request) -> str:
    """
    The caller's IP. Only trusts a forwarding header when CLIENT_IP_HEADER is
    configured (i.e. we are meant to be behind the Cloudflare proxy) AND the
    request carries a valid proxy shared secret (i.e. it actually came
    through the proxy and was not sent directly to the backend). Falls back
    to REMOTE_ADDR whenever either condition is not met.
    """
    header = settings.CLIENT_IP_HEADER
    if header and _proxy_secret_is_valid(request):
        value = request.META.get("HTTP_" + header.upper().replace("-", "_"), "")
        if value:
            return value.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""
