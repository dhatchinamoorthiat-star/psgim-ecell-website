from django.contrib.sessions.models import Session
from django.utils import timezone


def end_all_sessions(user, *, except_key: str | None = None) -> int:
    """
    Sign a user out everywhere ("logout everywhere").

    Django already rejects old sessions after a password change (the session
    stores a hash of the password), but that only happens lazily on their
    next request. This deletes them outright so nothing lingers in the table.
    Scans live sessions — fine at an E-Cell's scale; revisit if it grows.
    """
    ended = 0
    for session in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        if session.session_key == except_key:
            continue
        if session.get_decoded().get("_auth_user_id") == str(user.pk):
            session.delete()
            ended += 1
    return ended
