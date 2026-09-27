"""
Settings shared by every environment.

Configuration comes from environment variables only (12-factor), so the same
Docker image runs locally, in CI and on the host chosen in ADR-008. See
`backend/.env.example` for the full list.
"""

import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in (env(name, default) or "").split(",") if v.strip()]


def env_bool(name: str, default: bool = False) -> bool:
    return (env(name, str(default)) or "").lower() in {"1", "true", "yes", "on"}


SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.audit",
    "apps.memberships",
    "apps.verticals",
    "apps.rbac",
]

MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
APPEND_SLASH = False  # API URLs have no trailing slash (docs/12_API_CONTRACT.md)
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL", "postgres://ecell:ecell@localhost:5432/ecell"),
        conn_max_age=60,
        conn_health_checks=True,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Identity -------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

# Argon2 first: new and re-hashed passwords use it. The others remain only so
# Django can verify (and upgrade) a hash created by another hasher.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Reset links expire after one hour. Django's token also becomes invalid the
# moment the password changes or the user logs in again.
PASSWORD_RESET_TIMEOUT = 60 * 60

# --- Sessions & CSRF (ADR-005) -------------------------------------------

SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "ecell_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_PATH = "/"
SESSION_COOKIE_AGE = 60 * 60 * 12  # 12 h
SESSION_SAVE_EVERY_REQUEST = True  # sliding expiry: 12 h of inactivity ends it

# Angular's built-in XSRF support reads this cookie and echoes it in
# X-CSRFToken, so it must be readable by JavaScript (Django's default). The
# session cookie is the secret; the CSRF cookie is not.
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "http://localhost:4200")
CSRF_FAILURE_VIEW = "apps.core.views.csrf_failure"

# --- Caching (used only for rate limiting in Phase 1) ---------------------

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# --- Internationalisation -------------------------------------------------

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "UTC"  # storage is UTC; the organisation timezone is data (core.OrganizationSettings)
USE_I18N = False
USE_TZ = True
ORG_TIMEZONE_DEFAULT = env("ORG_TIMEZONE", "Asia/Kolkata")

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- Email ----------------------------------------------------------------
# Django 6.1 `MAILERS` format (the individual EMAIL_* settings are deprecated).
# The console backend prints mail — including reset links — to the runserver
# terminal. Set EMAIL_BACKEND to the SMTP backend and fill EMAIL_* to send for real.

_email_backend = env("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
_smtp_options = {
    "host": env("EMAIL_HOST", ""),
    "port": int(env("EMAIL_PORT", "587") or 587),
    "username": env("EMAIL_HOST_USER", ""),
    "password": env("EMAIL_HOST_PASSWORD", ""),
    "use_tls": env_bool("EMAIL_USE_TLS", True),
    # Without this, a hung SMTP connection blocks its worker thread forever
    # (review finding F5) — the bounded pool in apps/accounts/emails.py only
    # protects against *unbounded thread growth*, not a stuck one. 10s is
    # generous for a reset email (a few KB of text) over a working connection.
    "timeout": int(env("EMAIL_TIMEOUT", "10")),
}
MAILERS = {
    "default": {
        "BACKEND": _email_backend,
        "OPTIONS": _smtp_options if _email_backend.endswith("smtp.EmailBackend") else {},
    }
}
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "PSGIM E-Cell <no-reply@localhost>")

# Where password-reset links point (the Angular app's origin).
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:4200")

# When the API sits behind the Cloudflare proxy (ADR-004), the client IP
# arrives in this header. Leave empty when not behind a trusted proxy —
# otherwise anyone could spoof their IP for rate limiting and the audit log.
CLIENT_IP_HEADER = env("CLIENT_IP_HEADER", "")

# Shared secret the Cloudflare Pages Function attaches to every request it
# forwards (review finding F4). The backend is directly reachable (Render
# gives it a public URL), so CLIENT_IP_HEADER alone is spoofable by anyone
# who skips the proxy. CLIENT_IP_HEADER is trusted ONLY when this secret is
# also set and the request presents a matching value — see apps/core/net.py.
# Empty (the default) fails closed: the header is never trusted.
PROXY_SHARED_SECRET = env("PROXY_SHARED_SECRET", "")

# --- DRF ------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.core.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.PagePagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "login_ip": "20/min",
        "password_forgot": "5/hour",
        "password_reset": "10/hour",
    },
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "PSGIM E-Cell Platform API",
    "DESCRIPTION": "Generated from the implementation. The human summary is docs/12_API_CONTRACT.md.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# The OpenAPI schema and Swagger UI are open in development only.
API_DOCS_PUBLIC = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
