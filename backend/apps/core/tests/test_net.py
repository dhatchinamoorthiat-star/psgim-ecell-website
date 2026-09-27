"""
Client-IP trust boundary (review finding F4).

The backend is directly reachable (Render gives it a public URL), so
CLIENT_IP_HEADER alone is spoofable by anyone who skips the Cloudflare
proxy. client_ip() must only trust it when a proxy shared secret is also
present and correct.
"""

from django.test import RequestFactory, override_settings

from apps.core.net import client_ip

factory = RequestFactory()


def _request(*, client_ip_header_value=None, secret_header_value=None, remote_addr="10.0.0.1"):
    extra = {"REMOTE_ADDR": remote_addr}
    if client_ip_header_value is not None:
        extra["HTTP_CF_CONNECTING_IP"] = client_ip_header_value
    if secret_header_value is not None:
        extra["HTTP_X_ECELL_PROXY_SECRET"] = secret_header_value
    return factory.get("/", **extra)


@override_settings(CLIENT_IP_HEADER="CF-Connecting-IP", PROXY_SHARED_SECRET="s3cret")
def test_valid_secret_and_client_ip_is_trusted():
    request = _request(client_ip_header_value="203.0.113.5", secret_header_value="s3cret")
    assert client_ip(request) == "203.0.113.5"


@override_settings(CLIENT_IP_HEADER="CF-Connecting-IP", PROXY_SHARED_SECRET="s3cret")
def test_missing_secret_with_spoofed_client_ip_is_not_trusted():
    request = _request(client_ip_header_value="203.0.113.5", secret_header_value=None, remote_addr="192.0.2.1")
    assert client_ip(request) == "192.0.2.1"  # falls back to REMOTE_ADDR


@override_settings(CLIENT_IP_HEADER="CF-Connecting-IP", PROXY_SHARED_SECRET="s3cret")
def test_invalid_secret_with_spoofed_client_ip_is_not_trusted():
    request = _request(client_ip_header_value="203.0.113.5", secret_header_value="wrong", remote_addr="192.0.2.1")
    assert client_ip(request) == "192.0.2.1"


@override_settings(CLIENT_IP_HEADER="CF-Connecting-IP", PROXY_SHARED_SECRET="s3cret")
def test_valid_secret_without_client_ip_header_falls_back_safely():
    request = _request(client_ip_header_value=None, secret_header_value="s3cret", remote_addr="192.0.2.9")
    assert client_ip(request) == "192.0.2.9"


@override_settings(CLIENT_IP_HEADER="", PROXY_SHARED_SECRET="")
def test_existing_behaviour_unchanged_when_not_behind_a_proxy():
    request = _request(client_ip_header_value="203.0.113.5", secret_header_value=None, remote_addr="192.0.2.1")
    assert client_ip(request) == "192.0.2.1"


@override_settings(CLIENT_IP_HEADER="CF-Connecting-IP", PROXY_SHARED_SECRET="")
def test_configured_header_without_a_secret_fails_closed():
    """An operator who sets CLIENT_IP_HEADER but forgets PROXY_SHARED_SECRET must not silently trust spoofable input."""
    request = _request(client_ip_header_value="203.0.113.5", secret_header_value=None, remote_addr="192.0.2.1")
    assert client_ip(request) == "192.0.2.1"
