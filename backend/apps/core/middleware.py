import re
import uuid

_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestIdMiddleware:
    """
    Gives every request an id (reusing a sane incoming X-Request-ID, e.g. from
    Cloudflare) so an audit row can be matched to a log line.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get("X-Request-ID", "")
        request.request_id = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response
