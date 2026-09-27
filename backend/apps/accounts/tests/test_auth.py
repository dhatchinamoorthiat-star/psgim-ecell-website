"""Authentication, sessions and CSRF (docs/12_API_CONTRACT.md "Auth"; ADR-005)."""

import re

import pytest
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.throttles import LoginThrottle, PasswordForgotThrottle
from apps.audit.models import AuditLog
from conftest import PASSWORD, client_for, make_user

pytestmark = pytest.mark.django_db
LOGIN = "/api/v1/auth/login"


def csrf_client() -> tuple[APIClient, str]:
    """A client that behaves like the browser: CSRF enforced, token fetched first."""
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    return client, token


def test_csrf_endpoint_sets_readable_cookie():
    client = APIClient()
    r = client.get("/api/v1/auth/csrf")
    assert r.status_code == 200 and r.json()["csrf_token"]
    cookie = r.cookies["csrftoken"]
    assert not cookie["httponly"]  # Angular must be able to read it
    assert cookie["samesite"] == "Lax"


def test_login_requires_csrf_token():
    make_user("a@test.example")
    client = APIClient(enforce_csrf_checks=True)
    r = client.post(LOGIN, {"email": "a@test.example", "password": PASSWORD})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "csrf_failed"


def test_login_with_csrf_sets_session_and_returns_me():
    user = make_user("a@test.example")
    client, token = csrf_client()
    r = client.post(LOGIN, {"email": "A@Test.Example ", "password": PASSWORD}, HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 200, r.content
    body = r.json()
    assert body["user"]["email"] == user.email
    assert body["permissions"] == []
    assert body["organization"]["timezone"] == "Asia/Kolkata"
    session_cookie = r.cookies["ecell_session"]
    assert session_cookie["httponly"] and session_cookie["samesite"] == "Lax" and session_cookie["path"] == "/"
    assert "ecell_session" not in r.json()  # the session id is never in the body
    assert AuditLog.objects.filter(action="auth.login", actor=user).exists()


def test_login_rotates_session_key():
    """
    Session fixation: a session id known before sign-in (e.g. planted by an attacker) must not
    become the authenticated session. Fails if django.contrib.auth.login() stops cycling the key.
    """
    user = make_user("a@test.example")
    # 1. an anonymous session exists and its key is known
    pre = SessionStore()
    pre["planted"] = True
    pre.create()
    old_key = pre.session_key
    client = APIClient()
    client.cookies["ecell_session"] = old_key
    # 2-3. sign in while presenting it
    r = client.post(LOGIN, {"email": user.email, "password": PASSWORD})
    assert r.status_code == 200
    # 4-5. a different key is issued
    new_key = r.cookies["ecell_session"].value
    assert new_key and new_key != old_key
    # 6. the old key is gone and does not authenticate
    assert not SessionStore().exists(old_key)
    attacker = APIClient()
    attacker.cookies["ecell_session"] = old_key
    assert attacker.get("/api/v1/auth/me").status_code == 401
    # 7. the new session works
    victim = APIClient()
    victim.cookies["ecell_session"] = new_key
    assert victim.get("/api/v1/auth/me").json()["user"]["email"] == user.email


def test_authenticated_unsafe_request_without_csrf_is_rejected():
    user = make_user("a@test.example")
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)
    assert client.post("/api/v1/auth/logout").status_code == 403


@pytest.mark.parametrize("case", ["wrong_password", "unknown_email", "inactive"])
def test_failed_logins_are_indistinguishable(case):
    make_user("a@test.example")
    make_user("off@test.example", status="inactive")
    email, pw = {
        "wrong_password": ("a@test.example", "nope-nope-nope"),
        "unknown_email": ("ghost@test.example", PASSWORD),
        "inactive": ("off@test.example", PASSWORD),
    }[case]
    r = client_for(None).post(LOGIN, {"email": email, "password": pw})
    assert r.status_code == 400
    assert r.json() == {"error": {"code": "invalid_credentials", "message": "Email or password is incorrect."}}
    row = AuditLog.objects.get(action="auth.login_failed")
    assert row.result == "DENIED" and pw not in str(row.summary) + str(row.after)


def test_login_is_rate_limited(monkeypatch):
    monkeypatch.setattr(LoginThrottle, "THROTTLE_RATES", {"login": "5/min"})
    make_user("a@test.example")
    client = client_for(None)
    codes = [client.post(LOGIN, {"email": "a@test.example", "password": "wrong-wrong"}).status_code for _ in range(6)]
    assert codes == [400] * 5 + [429]


def test_me_requires_session():
    r = APIClient().get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


def test_logout_ends_session():
    user = make_user("a@test.example")
    client, token = csrf_client()
    client.post(LOGIN, {"email": user.email, "password": PASSWORD}, HTTP_X_CSRFTOKEN=token)
    token = client.cookies["csrftoken"].value  # rotated at login
    assert client.post("/api/v1/auth/logout", HTTP_X_CSRFTOKEN=token).status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


# --- Forgot / reset ------------------------------------------------------------------


def test_forgot_password_does_not_reveal_accounts():
    make_user("a@test.example")
    client = client_for(None)
    known = client.post("/api/v1/auth/password/forgot", {"email": "a@test.example"})
    unknown = client.post("/api/v1/auth/password/forgot", {"email": "ghost@test.example"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["a@test.example"]


def test_forgot_password_is_rate_limited(monkeypatch):
    monkeypatch.setattr(PasswordForgotThrottle, "THROTTLE_RATES", {"password_forgot": "2/hour"})
    client = client_for(None)
    codes = [client.post("/api/v1/auth/password/forgot", {"email": f"x{i}@test.example"}).status_code for i in range(3)]
    assert codes == [202, 202, 429]


def _reset_params():
    link = re.search(r"https?://\S+", mail.outbox[-1].body).group(0)
    uid = re.search(r"uid=([^&]+)", link).group(1)
    token = re.search(r"token=([^&\s]+)", link).group(1)
    return uid, token


def test_password_reset_changes_password_and_ends_all_sessions():
    user = make_user("a@test.example")
    elsewhere = client_for(user)  # a session on another device
    assert elsewhere.get("/api/v1/auth/me").status_code == 200
    client_for(None).post("/api/v1/auth/password/forgot", {"email": user.email})
    uid, token = _reset_params()
    assert token not in str(list(AuditLog.objects.values_list("summary", "after")))  # never logged

    r = client_for(None).post(
        "/api/v1/auth/password/reset", {"uid": uid, "token": token, "new_password": "a-brand-new-passphrase"}
    )
    assert r.status_code == 200, r.content
    user.refresh_from_db()
    assert user.check_password("a-brand-new-passphrase")
    assert user.email_verified_at is not None
    assert elsewhere.get("/api/v1/auth/me").status_code == 401  # logout-everywhere
    assert not any(s.get_decoded().get("_auth_user_id") == str(user.pk) for s in Session.objects.all())

    # Single use.
    again = client_for(None).post(
        "/api/v1/auth/password/reset", {"uid": uid, "token": token, "new_password": "yet-another-passphrase"}
    )
    assert again.status_code == 400 and again.json()["error"]["code"] == "invalid_token"


@pytest.mark.parametrize("uid,token", [("bogus", "bogus"), ("", "x"), ("MTIz", "1-2")])
def test_password_reset_rejects_bad_tokens(uid, token):
    r = client_for(None).post(
        "/api/v1/auth/password/reset", {"uid": uid or "x", "token": token, "new_password": "whatever-passphrase"}
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_token"


def test_password_reset_enforces_password_rules():
    user = make_user("a@test.example")
    client_for(None).post("/api/v1/auth/password/forgot", {"email": user.email})
    uid, token = _reset_params()
    r = client_for(None).post("/api/v1/auth/password/reset", {"uid": uid, "token": token, "new_password": "short"})
    assert r.status_code == 400 and "new_password" in r.json()["error"]["fields"]


def test_reset_request_for_inactive_account_sends_nothing():
    make_user("off@test.example", status="inactive")
    r = client_for(None).post("/api/v1/auth/password/forgot", {"email": "off@test.example"})
    assert r.status_code == 202 and len(mail.outbox) == 0


def test_production_hasher_is_argon2():
    from config.settings import base

    assert base.PASSWORD_HASHERS[0].endswith("Argon2PasswordHasher")


def test_expired_reset_token_is_rejected(monkeypatch):
    from datetime import datetime, timedelta

    from django.conf import settings
    from django.contrib.auth.tokens import default_token_generator

    user = make_user("a@test.example")
    client_for(None).post("/api/v1/auth/password/forgot", {"email": user.email})
    uid, token = _reset_params()
    later = datetime.now() + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT + 60)
    monkeypatch.setattr(default_token_generator, "_now", lambda: later)
    r = client_for(None).post(
        "/api/v1/auth/password/reset", {"uid": uid, "token": token, "new_password": "a-brand-new-passphrase"}
    )
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_token"
    user.refresh_from_db()
    assert user.check_password(PASSWORD)  # unchanged


def test_old_password_stops_working_after_reset():
    user = make_user("a@test.example")
    client_for(None).post("/api/v1/auth/password/forgot", {"email": user.email})
    uid, token = _reset_params()
    assert (
        client_for(None)
        .post("/api/v1/auth/password/reset", {"uid": uid, "token": token, "new_password": "a-brand-new-passphrase"})
        .status_code
        == 200
    )
    assert client_for(None).post(LOGIN, {"email": user.email, "password": PASSWORD}).status_code == 400
    assert client_for(None).post(LOGIN, {"email": user.email, "password": "a-brand-new-passphrase"}).status_code == 200
