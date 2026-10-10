"""
Production settings. Not deployed anywhere yet — production deployment is
gated by N-1 in docs/PHASE_1_AUTHORIZATION.md.
"""

import os

from django.core.exceptions import ImproperlyConfigured

from config.database import database_settings_from_env

from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS, SECRET_KEY

if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

DEBUG = False

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
# The host's internal health probe may use plain HTTP; a 301 there would mark
# a healthy service as failing. Only the health endpoint is exempt — it
# carries no session and returns no sensitive data (apps.core.views.HealthView).
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health$"]
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_CONTENT_TYPE_NOSNIFF = True

# Rate-limit counters must be shared between gunicorn workers. The database
# cache needs no extra infrastructure (ADR-006); create the table on release
# with `python manage.py createcachetable`.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}}

# Render sets RENDER_EXTERNAL_HOSTNAME to the service's own onrender.com host.
# Trusting it saves hand-maintaining that name in ALLOWED_HOSTS; it is the
# host the Cloudflare /api proxy (API_ORIGIN) talks to. A new list is built
# rather than appending, so base.ALLOWED_HOSTS is never mutated.
if _render_host := os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip():
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, _render_host]

# Production database connections must use TLS (config/database.py).
DATABASES = {"default": database_settings_from_env(os.environ, require_ssl=True)}
