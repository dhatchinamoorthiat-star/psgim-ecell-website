from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK

SECRET_KEY = "test-only-key"
DEBUG = False
MAILERS = {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}

# Fast hashing in tests only; production uses Argon2 (see base.py).
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Throttling is exercised by dedicated tests that override these; everything
# else gets generous limits so unrelated tests never trip them.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {"login": "1000/min", "password_forgot": "1000/min", "password_reset": "1000/min"},
}
