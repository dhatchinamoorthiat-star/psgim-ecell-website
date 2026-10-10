"""config/database.py — Neon-aware DATABASES from environment variables."""

import pytest
from django.core.exceptions import ImproperlyConfigured

from config.database import DIRECT_CONN_MAX_AGE, database_settings, database_settings_from_env, is_pooled_host

DIRECT = "postgres://app:pw@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/ecell"
POOLED = "postgres://app:pw@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/ecell"


def test_pooled_host_detection():
    assert is_pooled_host("ep-x-pooler.ap-southeast-1.aws.neon.tech")
    assert not is_pooled_host("ep-x.ap-southeast-1.aws.neon.tech")
    assert not is_pooled_host(None)


def test_direct_endpoint_keeps_persistent_connections_and_cursors():
    cfg = database_settings(DIRECT)
    assert cfg["CONN_MAX_AGE"] == DIRECT_CONN_MAX_AGE
    assert cfg["CONN_HEALTH_CHECKS"] is True
    assert cfg["DISABLE_SERVER_SIDE_CURSORS"] is False
    assert cfg["HOST"] == "ep-cool-name-123456.ap-southeast-1.aws.neon.tech"
    assert cfg["NAME"] == "ecell"


def test_pooled_endpoint_disables_what_pgbouncer_transaction_mode_breaks():
    cfg = database_settings(POOLED)
    assert cfg["CONN_MAX_AGE"] == 0
    assert cfg["DISABLE_SERVER_SIDE_CURSORS"] is True


def test_explicit_settings_override_pooled_defaults():
    cfg = database_settings(POOLED, conn_max_age=30, disable_server_side_cursors=False)
    assert cfg["CONN_MAX_AGE"] == 30
    assert cfg["DISABLE_SERVER_SIDE_CURSORS"] is False


def test_tls_not_forced_outside_production():
    assert "sslmode" not in database_settings(DIRECT)["OPTIONS"]


def test_production_adds_sslmode_require_when_absent():
    assert database_settings(DIRECT, require_ssl=True)["OPTIONS"]["sslmode"] == "require"


@pytest.mark.parametrize("mode", ["require", "verify-ca", "verify-full"])
def test_production_keeps_an_explicit_strong_sslmode(mode):
    assert database_settings(f"{DIRECT}?sslmode={mode}", require_ssl=True)["OPTIONS"]["sslmode"] == mode


@pytest.mark.parametrize("mode", ["disable", "allow", "prefer"])
def test_production_refuses_a_weak_sslmode(mode):
    with pytest.raises(ImproperlyConfigured, match="sslmode"):
        database_settings(f"{DIRECT}?sslmode={mode}", require_ssl=True)


def test_from_env_reads_the_optional_overrides():
    cfg = database_settings_from_env({"DATABASE_URL": POOLED, "DB_CONN_MAX_AGE": "15", "DB_DISABLE_SERVER_SIDE_CURSORS": "false"})
    assert cfg["CONN_MAX_AGE"] == 15
    assert cfg["DISABLE_SERVER_SIDE_CURSORS"] is False


def test_from_env_treats_blank_overrides_as_unset():
    cfg = database_settings_from_env({"DATABASE_URL": POOLED, "DB_CONN_MAX_AGE": " ", "DB_DISABLE_SERVER_SIDE_CURSORS": ""})
    assert cfg["CONN_MAX_AGE"] == 0
    assert cfg["DISABLE_SERVER_SIDE_CURSORS"] is True


def test_from_env_falls_back_to_the_local_default_database():
    cfg = database_settings_from_env({})
    assert cfg["HOST"] == "localhost" and cfg["NAME"] == "ecell"


@pytest.mark.parametrize(
    ("name", "value"),
    [("DB_CONN_MAX_AGE", "soon"), ("DB_CONN_MAX_AGE", "-1"), ("DB_DISABLE_SERVER_SIDE_CURSORS", "maybe")],
)
def test_from_env_rejects_invalid_overrides(name, value):
    with pytest.raises(ImproperlyConfigured, match=name):
        database_settings_from_env({"DATABASE_URL": DIRECT, name: value})


def test_error_messages_never_echo_the_connection_string():
    with pytest.raises(ImproperlyConfigured) as exc:
        database_settings("postgres://app:hunter2@ep-x.neon.tech/db?sslmode=disable", require_ssl=True)
    assert "hunter2" not in str(exc.value)
