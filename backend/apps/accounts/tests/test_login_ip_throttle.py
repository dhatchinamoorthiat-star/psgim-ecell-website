"""
Per-IP login throttling (review finding F3).

LoginThrottle alone buckets by (IP, email), so one IP spraying different
email addresses was unlimited. LoginIpThrottle closes that gap with a
separate, IP-only bucket. These tests pin both throttles to small,
explicit rates via monkeypatch (the same pattern as
test_login_is_rate_limited in test_auth.py) so the table below is exact
regardless of the production defaults in settings/base.py.
"""

import pytest

from apps.accounts.throttles import LoginIpThrottle, LoginThrottle
from conftest import PASSWORD, client_for, make_user

pytestmark = pytest.mark.django_db
LOGIN = "/api/v1/auth/login"


def _pin(monkeypatch, *, ip_rate: str, email_rate: str = "1000/min"):
    monkeypatch.setattr(LoginIpThrottle, "THROTTLE_RATES", {"login_ip": ip_rate})
    monkeypatch.setattr(LoginThrottle, "THROTTLE_RATES", {"login": email_rate})


def _attempt(client, email, ip):
    return client.post(LOGIN, {"email": email, "password": "wrong-wrong"}, REMOTE_ADDR=ip).status_code


# 1. attempts below the IP limit ------------------------------------------------------------


def test_attempts_below_the_ip_limit_all_go_through(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    make_user("a@test.example")
    client = client_for(None)
    codes = [_attempt(client, "a@test.example", "9.9.9.1") for _ in range(5)]
    assert codes == [400] * 5


# 2. IP limit exceeded -----------------------------------------------------------------------


def test_ip_limit_exceeded_returns_429(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    make_user("a@test.example")
    client = client_for(None)
    codes = [_attempt(client, "a@test.example", "9.9.9.2") for _ in range(6)]
    assert codes == [400] * 5 + [429]


# 3. different emails from the same IP still count toward the IP limit -----------------------


def test_different_emails_from_same_ip_share_the_ip_bucket(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    for i in range(6):
        make_user(f"user{i}@test.example")
    client = client_for(None)
    codes = [_attempt(client, f"user{i}@test.example", "9.9.9.3") for i in range(6)]
    assert codes == [400] * 5 + [429]  # 6 distinct emails, 1 IP -> still blocked on the 6th


# 4. different IPs do not share the same bucket -----------------------------------------------


def test_different_ips_have_independent_buckets(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    make_user("a@test.example")
    client = client_for(None)
    for _ in range(5):
        assert _attempt(client, "a@test.example", "9.9.9.4") == 400
    # A fresh IP is not affected by the first IP's exhausted bucket.
    assert _attempt(client, "a@test.example", "9.9.9.5") == 400


# 5. existing IP+email throttling still works --------------------------------------------------


def test_existing_ip_and_email_throttle_still_enforced(monkeypatch):
    _pin(monkeypatch, ip_rate="1000/min", email_rate="5/min")
    make_user("a@test.example")
    client = client_for(None)
    codes = [_attempt(client, "a@test.example", "9.9.9.6") for _ in range(6)]
    assert codes == [400] * 5 + [429]


# 6. successful and failed login behaviour remains correct --------------------------------------


def test_successful_login_still_works_under_the_ip_throttle(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    user = make_user("a@test.example")
    client = client_for(None)
    for _ in range(3):
        _attempt(client, user.email, "9.9.9.7")
    r = client.post(LOGIN, {"email": user.email, "password": PASSWORD}, REMOTE_ADDR="9.9.9.7")
    assert r.status_code == 200


def test_failed_logins_still_return_invalid_credentials_under_the_ip_throttle(monkeypatch):
    _pin(monkeypatch, ip_rate="5/min")
    make_user("a@test.example")
    client = client_for(None)
    r = client.post(LOGIN, {"email": "a@test.example", "password": "wrong-wrong"}, REMOTE_ADDR="9.9.9.8")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_credentials"


def test_ip_limit_exhausted_still_blocks_a_login_that_would_otherwise_succeed(monkeypatch):
    """The IP bucket is IP-only: once it is exhausted, even the right password from that IP is throttled."""
    _pin(monkeypatch, ip_rate="5/min")
    user = make_user("a@test.example")
    client = client_for(None)
    for i in range(5):
        make_user(f"other{i}@test.example")
        _attempt(client, f"other{i}@test.example", "9.9.9.9")
    r = client.post(LOGIN, {"email": user.email, "password": PASSWORD}, REMOTE_ADDR="9.9.9.9")
    assert r.status_code == 429
