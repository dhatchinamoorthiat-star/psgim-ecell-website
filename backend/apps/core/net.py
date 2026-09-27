from django.conf import settings


def client_ip(request) -> str:
    """
    The caller's IP. Only trusts a forwarding header when CLIENT_IP_HEADER is
    configured (i.e. we are actually behind the Cloudflare proxy); otherwise a
    client could spoof its address to dodge rate limits or pollute the audit log.
    """
    header = settings.CLIENT_IP_HEADER
    if header:
        value = request.META.get("HTTP_" + header.upper().replace("-", "_"), "")
        if value:
            return value.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""
