import hashlib
import hmac

from django.conf import settings


def hash_ip(ip: str) -> str:
    """
    A keyed hash of the caller's IP, for spotting repeat submissions without
    storing the address. Keyed with SECRET_KEY so the digest cannot be
    reversed by hashing the (small) IPv4 space offline — a plain sha256 of an
    IP is trivially brute-forced.

    Returns "" for an unknown IP so the column stays empty rather than
    carrying the hash of an empty string.
    """
    if not ip:
        return ""
    return hmac.new(settings.SECRET_KEY.encode(), ip.encode(), hashlib.sha256).hexdigest()
