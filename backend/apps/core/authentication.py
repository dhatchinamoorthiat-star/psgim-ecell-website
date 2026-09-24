from rest_framework import authentication


class SessionAuthentication(authentication.SessionAuthentication):
    """
    DRF's session authentication, with a WWW-Authenticate value so that a
    missing session answers 401 (not signed in) rather than 403 (signed in,
    not allowed) — the distinction docs/12_API_CONTRACT.md relies on.
    CSRF enforcement is inherited unchanged.
    """

    def authenticate_header(self, request):
        return "Session"
