"""
Cloudinary signed-upload params (task §21: never expose Cloudinary
credentials to Angular). Replicates the signing scheme already used by the
legacy Control Room (`ecell/src/lib/cloudinary.ts` `signUpload`) so both
systems can share one Cloudinary account: sign the alphabetically-sorted
`k=v&k=v` param string with the API secret appended, SHA-1 hex digest. The
browser uploads directly to Cloudinary with this signature; the file never
passes through Django, and the API secret never leaves it.
"""

import hashlib
import time

from django.conf import settings
from rest_framework.exceptions import APIException


class CloudinaryNotConfigured(APIException):
    status_code = 503
    default_detail = "Media uploads are not configured on this server."
    default_code = "cloudinary_not_configured"


def folder_for_scope(*, owner_vertical_id) -> str:
    """
    The Cloudinary folder is derived from the actor's *verified* upload
    scope, never taken from client input (a gate-review finding: an
    arbitrary client-supplied folder let any uploader write into any
    vertical's folder, or a reserved one). Callers must verify
    `media.upload` for this exact scope before calling this.
    """
    return f"vertical/{owner_vertical_id}" if owner_vertical_id else "global"


def signed_upload_params(*, owner_vertical_id) -> dict:
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        raise CloudinaryNotConfigured()

    timestamp = int(time.time())
    scoped_folder = f"ecell/{folder_for_scope(owner_vertical_id=owner_vertical_id)}"
    params = {"folder": scoped_folder, "timestamp": timestamp}
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    signature = hashlib.sha1((to_sign + settings.CLOUDINARY_API_SECRET).encode()).hexdigest()

    return {
        "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "signature": signature,
        "folder": scoped_folder,
        "endpoint": f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload",
    }
