"""GET /api/v1/health — the host health check (docs/28_A2_DEPLOYMENT_RUNBOOK.md)."""

import importlib
import sys
from unittest import mock

import pytest
from django.db import OperationalError
from django.test import override_settings
from rest_framework.test import APIClient

from apps.core import views

HEALTH = "/api/v1/health"


def load_prod_settings(monkeypatch, **env):
    """Import config.settings.prod fresh, under the given environment, without touching live settings."""
    import config.settings.base as base

    monkeypatch.setattr(base, "SECRET_KEY", base.SECRET_KEY or "test-only-not-a-secret")
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    sys.modules.pop("config.settings.prod", None)
    try:
        return importlib.import_module("config.settings.prod")
    finally:
        sys.modules.pop("config.settings.prod", None)


@pytest.mark.django_db
def test_health_is_public_and_reports_ok():
    r = APIClient().get(HEALTH)
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}
    assert r["Cache-Control"] == "no-store"


@pytest.mark.django_db
def test_health_creates_no_session_and_sets_no_cookies():
    from django.contrib.sessions.models import Session

    before = Session.objects.count()
    r = APIClient().get(HEALTH)
    assert r.status_code == 200
    assert not r.cookies
    assert Session.objects.count() == before


@pytest.mark.django_db
def test_health_ignores_a_session_cookie_and_needs_no_csrf():
    client = APIClient(enforce_csrf_checks=True)
    client.cookies["ecell_session"] = "not-a-real-session"
    assert client.get(HEALTH).status_code == 200


@pytest.mark.django_db
def test_health_head_is_supported_for_probes():
    assert APIClient().head(HEALTH).status_code == 200


@pytest.mark.django_db
def test_health_is_read_only():
    client = APIClient()
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(HEALTH).status_code == 405, method


@pytest.mark.django_db
def test_health_reports_503_without_leaking_driver_details():
    leaky = OperationalError('could not connect to server: host "ep-secret-123.neon.tech" user "owner"')
    with mock.patch.object(views.connection, "cursor", side_effect=leaky):
        r = APIClient().get(HEALTH)
    assert r.status_code == 503
    assert r.json() == {"status": "error", "database": "unavailable"}
    assert b"neon" not in r.content and b"owner" not in r.content
    assert r["Cache-Control"] == "no-store"


@pytest.mark.django_db
def test_prod_exempts_only_health_from_the_https_redirect(monkeypatch):
    prod = load_prod_settings(monkeypatch)
    with override_settings(SECURE_SSL_REDIRECT=True, SECURE_REDIRECT_EXEMPT=prod.SECURE_REDIRECT_EXEMPT):
        client = APIClient()
        assert client.get(HEALTH).status_code == 200  # plain-HTTP probe is answered
        other = client.get("/api/v1/auth/csrf")
        assert other.status_code == 301 and other["Location"].startswith("https://")
        assert client.get("/api/v1/healthz").status_code == 301  # exemption is exact, not a prefix


def test_prod_trusts_render_external_hostname_without_mutating_base(monkeypatch):
    import config.settings.base as base

    before = list(base.ALLOWED_HOSTS)
    prod = load_prod_settings(monkeypatch, RENDER_EXTERNAL_HOSTNAME="ecell-api.onrender.com")
    assert "ecell-api.onrender.com" in prod.ALLOWED_HOSTS
    assert base.ALLOWED_HOSTS == before
    assert prod.ALLOWED_HOSTS is not base.ALLOWED_HOSTS


def test_prod_without_render_hostname_keeps_configured_hosts(monkeypatch):
    import config.settings.base as base

    monkeypatch.delenv("RENDER_EXTERNAL_HOSTNAME", raising=False)
    prod = load_prod_settings(monkeypatch)
    assert prod.ALLOWED_HOSTS == base.ALLOWED_HOSTS


def test_prod_requires_tls_to_the_database(monkeypatch):
    prod = load_prod_settings(monkeypatch, DATABASE_URL="postgres://u:p@ep-x.aws.neon.tech/db")
    assert prod.DATABASES["default"]["OPTIONS"]["sslmode"] == "require"
