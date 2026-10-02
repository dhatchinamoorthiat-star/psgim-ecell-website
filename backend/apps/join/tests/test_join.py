"""Public membership-interest submission and the staff-facing inbox."""

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.join import emails as emails_module
from apps.join.models import JoinSubmission
from apps.join.serializers import MIN_FILL_SECONDS
from apps.join.throttles import JoinSubmitThrottle
from conftest import client_for, grant, make_user

pytestmark = pytest.mark.django_db

SUBMIT = "/api/v1/public/join"
LIST = "/api/v1/join/submissions"

VALID = {
    "name": "Asha Raman",
    "email": "asha@test.example",
    "programme_or_year": "MBA 2026",
    "message": "I want to help run the bootcamp.",
    "elapsed_ms": (MIN_FILL_SECONDS + 2) * 1000,
}


@pytest.fixture(autouse=True)
def _clear_throttle():
    JoinSubmitThrottle().cache.clear()
    yield
    JoinSubmitThrottle().cache.clear()


def csrf_client() -> tuple[APIClient, str]:
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    return client, token


def submit(payload: dict | None = None, **kwargs):
    client, token = csrf_client()
    return client.post(SUBMIT, {**VALID, **(payload or {})}, format="json", HTTP_X_CSRFTOKEN=token, **kwargs)


# --- public submission -------------------------------------------------------


def test_valid_submission_is_stored_and_accepted():
    r = submit()
    assert r.status_code == 202
    assert r.json() == {"status": "accepted"}
    s = JoinSubmission.objects.get()
    assert (s.name, s.email, s.programme_or_year) == ("Asha Raman", "asha@test.example", "MBA 2026")
    assert s.source == "direct" and s.handled is False and s.handled_at is None


def test_submission_requires_no_authentication():
    assert submit().status_code == 202


def test_invalid_email_is_rejected_with_field_errors():
    r = submit({"email": "not-an-email"})
    assert r.status_code == 400
    assert "email" in r.json()["error"]["fields"]
    assert not JoinSubmission.objects.exists()


@pytest.mark.parametrize("field", ["name", "email", "programme_or_year"])
def test_missing_required_field_is_rejected(field):
    payload = {k: v for k, v in VALID.items() if k != field}
    client, token = csrf_client()
    r = client.post(SUBMIT, payload, format="json", HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 400
    assert field in r.json()["error"]["fields"]
    assert not JoinSubmission.objects.exists()


def test_blank_name_is_rejected():
    assert submit({"name": "   "}).status_code == 400


def test_message_is_optional():
    r = submit({"message": ""})
    assert r.status_code == 202 and JoinSubmission.objects.get().message == ""


def test_csrf_token_is_required():
    client = APIClient(enforce_csrf_checks=True)
    r = client.post(SUBMIT, VALID, format="json")
    assert r.status_code == 403
    assert not JoinSubmission.objects.exists()


def test_honeypot_submission_is_rejected_and_not_stored():
    r = submit({"website": "http://spam.example"})
    assert r.status_code == 400
    assert not JoinSubmission.objects.exists()


def test_submission_faster_than_the_minimum_fill_time_is_rejected():
    r = submit({"elapsed_ms": 200})
    assert r.status_code == 400
    assert not JoinSubmission.objects.exists()


def test_missing_elapsed_ms_still_submits():
    payload = {k: v for k, v in VALID.items() if k != "elapsed_ms"}
    client, token = csrf_client()
    assert client.post(SUBMIT, payload, format="json", HTTP_X_CSRFTOKEN=token).status_code == 202


def test_anti_spam_rejection_does_not_say_which_check_failed():
    message = submit({"website": "x"}).json()["error"]["message"].lower()
    assert "honeypot" not in message and "fill" not in message and "elapsed" not in message


def test_throttle_blocks_repeated_submissions(monkeypatch):
    # Pinned here rather than relying on the production default, matching
    # apps/accounts/tests/test_login_ip_throttle.py.
    monkeypatch.setattr(JoinSubmitThrottle, "THROTTLE_RATES", {"join_submit": "5/hour"})
    for _ in range(5):
        assert submit().status_code == 202
    r = submit()
    assert r.status_code == 429
    assert r.json()["error"]["code"]
    assert JoinSubmission.objects.count() == 5


def test_duplicate_submission_is_accepted_and_kept():
    """A resend is stored, not silently dropped: the same person may legitimately apply twice."""
    assert submit().status_code == 202
    assert submit().status_code == 202
    assert JoinSubmission.objects.filter(email="asha@test.example").count() == 2


def test_ip_is_hashed_never_stored_raw():
    submit(REMOTE_ADDR="203.0.113.9")
    s = JoinSubmission.objects.get()
    assert s.ip_hash and "203.0.113.9" not in s.ip_hash and len(s.ip_hash) == 64


def test_audit_record_is_written_without_the_message_body():
    submit()
    entry = AuditLog.objects.filter(action="join.submission_created").get()
    assert "bootcamp" not in entry.summary
    assert "asha@test.example" not in entry.summary


# --- source attribution ------------------------------------------------------


@pytest.mark.parametrize("source", ["navbar", "home", "about", "nec", "direct"])
def test_known_sources_are_recorded(source):
    assert submit({"source": source}).status_code == 202
    assert JoinSubmission.objects.get().source == source


@pytest.mark.parametrize("source", ["<script>", "spam", "", "' OR 1=1"])
def test_unknown_source_falls_back_to_direct(source):
    assert submit({"source": source}).status_code == 202
    assert JoinSubmission.objects.get().source == "direct"


# --- email -------------------------------------------------------------------


def test_notification_sent_when_recipient_configured(settings):
    settings.JOIN_NOTIFY_EMAIL = "inbox@test.example"
    submit()
    emails_module.join_pending()
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["inbox@test.example"]


def test_notification_excludes_the_message_body(settings):
    settings.JOIN_NOTIFY_EMAIL = "inbox@test.example"
    submit()
    emails_module.join_pending()
    assert "bootcamp" not in mail.outbox[0].body


def test_submission_succeeds_when_no_recipient_configured(settings):
    settings.JOIN_NOTIFY_EMAIL = ""
    r = submit()
    emails_module.join_pending()
    assert r.status_code == 202
    assert JoinSubmission.objects.exists()
    assert mail.outbox == []


# --- staff inbox: permission enforcement -------------------------------------


def _submission() -> JoinSubmission:
    submit()
    return JoinSubmission.objects.get()


def test_anonymous_cannot_read_submissions():
    _submission()
    assert client_for(None).get(LIST).status_code in (401, 403)


def test_authenticated_user_without_permission_cannot_read_submissions():
    _submission()
    outsider = make_user("outsider@test.example")
    r = client_for(outsider).get(LIST)
    assert r.status_code == 403


def test_super_admin_can_read_submissions():
    _submission()
    admin = make_user("admin@test.example")
    grant(admin, "SUPER_ADMIN")
    r = client_for(admin).get(LIST)
    assert r.status_code == 200
    assert r.json()["results"][0]["email"] == "asha@test.example"


def test_listing_never_exposes_the_ip_hash():
    _submission()
    admin = make_user("admin2@test.example")
    grant(admin, "SUPER_ADMIN")
    assert "ip_hash" not in client_for(admin).get(LIST).json()["results"][0]


def test_handled_filter():
    _submission()
    admin = make_user("admin3@test.example")
    grant(admin, "SUPER_ADMIN")
    assert len(client_for(admin).get(LIST, {"handled": "false"}).json()["results"]) == 1
    assert len(client_for(admin).get(LIST, {"handled": "true"}).json()["results"]) == 0


def test_marking_handled_requires_permission():
    s = _submission()
    outsider = make_user("outsider2@test.example")
    r = client_for(outsider).post(f"{LIST}/{s.pk}/handled", {"handled": True}, format="json")
    assert r.status_code == 403
    s.refresh_from_db()
    assert s.handled is False


def test_mark_handled_and_unhandled_round_trip():
    s = _submission()
    admin = make_user("admin4@test.example")
    grant(admin, "SUPER_ADMIN")
    client = client_for(admin)

    r = client.post(f"{LIST}/{s.pk}/handled", {"handled": True}, format="json")
    assert r.status_code == 200 and r.json()["handled"] is True
    s.refresh_from_db()
    assert s.handled is True and s.handled_at is not None
    assert AuditLog.objects.filter(action="join.submission_handled").exists()

    r = client.post(f"{LIST}/{s.pk}/handled", {"handled": False}, format="json")
    assert r.status_code == 200 and r.json()["handled"] is False
    s.refresh_from_db()
    assert s.handled is False and s.handled_at is None
    assert AuditLog.objects.filter(action="join.submission_unhandled").exists()


def test_marking_an_unknown_submission_is_404():
    admin = make_user("admin5@test.example")
    grant(admin, "SUPER_ADMIN")
    r = client_for(admin).post(f"{LIST}/00000000-0000-0000-0000-000000000000/handled", {"handled": True}, format="json")
    assert r.status_code == 404
