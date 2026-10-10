"""
Database configuration from environment variables (docs/28_A2_DEPLOYMENT_RUNBOOK.md).

Pure functions so they can be unit-tested without touching the live
connection settings. Neon-aware:

- Neon's *pooled* endpoint (host contains "-pooler.") runs PgBouncer in
  transaction mode. Django's persistent connections and server-side cursors
  are unsafe there, so for a pooled host both default off
  (CONN_MAX_AGE=0, DISABLE_SERVER_SIDE_CURSORS=True).
- The *direct* endpoint (recommended for this app's size) keeps the
  existing behaviour: 60 s persistent connections with health checks.
- Production requires TLS: an empty sslmode becomes "require"; a weaker
  explicit one (disable/allow/prefer) is refused rather than silently
  overridden; verify-ca / verify-full are kept as given.

Explicit DB_CONN_MAX_AGE / DB_DISABLE_SERVER_SIDE_CURSORS always win over
the pooled-host defaults.
"""

from collections.abc import Mapping

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

DEFAULT_DATABASE_URL = "postgres://ecell:ecell@localhost:5432/ecell"
DIRECT_CONN_MAX_AGE = 60
WEAK_SSLMODES = {"disable", "allow", "prefer"}

_TRUE = {"1", "true", "yes", "on"}
_FALSE = {"0", "false", "no", "off"}


def is_pooled_host(host: str | None) -> bool:
    return "-pooler." in (host or "")


def _optional_int(name: str, raw: str | None) -> int | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise ImproperlyConfigured(f"{name} must be an integer number of seconds.") from exc
    if value < 0:
        raise ImproperlyConfigured(f"{name} must not be negative.")
    return value


def _optional_bool(name: str, raw: str | None) -> bool | None:
    if raw is None or raw.strip() == "":
        return None
    lowered = raw.strip().lower()
    if lowered in _TRUE:
        return True
    if lowered in _FALSE:
        return False
    raise ImproperlyConfigured(f"{name} must be true or false.")


def database_settings(
    url: str,
    *,
    conn_max_age: int | None = None,
    disable_server_side_cursors: bool | None = None,
    require_ssl: bool = False,
) -> dict:
    config = dj_database_url.parse(url, conn_health_checks=True)
    pooled = is_pooled_host(config.get("HOST"))

    config["CONN_MAX_AGE"] = conn_max_age if conn_max_age is not None else (0 if pooled else DIRECT_CONN_MAX_AGE)
    config["DISABLE_SERVER_SIDE_CURSORS"] = disable_server_side_cursors if disable_server_side_cursors is not None else pooled

    options = dict(config.get("OPTIONS") or {})
    if require_ssl:
        sslmode = (options.get("sslmode") or "").strip().lower()
        if sslmode in WEAK_SSLMODES:
            raise ImproperlyConfigured(
                f"DATABASE_URL sets sslmode={sslmode}; production requires require, verify-ca or verify-full."
            )
        if not sslmode:
            options["sslmode"] = "require"
    config["OPTIONS"] = options
    return config


def database_settings_from_env(environ: Mapping[str, str], *, require_ssl: bool = False) -> dict:
    return database_settings(
        environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL,
        conn_max_age=_optional_int("DB_CONN_MAX_AGE", environ.get("DB_CONN_MAX_AGE")),
        disable_server_side_cursors=_optional_bool(
            "DB_DISABLE_SERVER_SIDE_CURSORS", environ.get("DB_DISABLE_SERVER_SIDE_CURSORS")
        ),
        require_ssl=require_ssl,
    )
