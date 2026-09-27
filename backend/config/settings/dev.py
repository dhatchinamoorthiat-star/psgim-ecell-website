from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True
SECRET_KEY = env("DJANGO_SECRET_KEY") or "dev-only-insecure-key-never-use-in-production"
API_DOCS_PUBLIC = True
