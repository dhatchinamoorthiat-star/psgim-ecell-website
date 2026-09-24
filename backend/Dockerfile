# Production image (ADR-008: Render; fallback Cloud Run). Not deployed yet —
# gated by N-1 in docs/PHASE_1_AUTHORIZATION.md.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod \
    PORT=8000

WORKDIR /app
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .
RUN useradd --create-home app && chown -R app /app
USER app

# Release step on the host: python manage.py migrate && python manage.py createcachetable && python manage.py seed_rbac
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --access-logfile -"]
