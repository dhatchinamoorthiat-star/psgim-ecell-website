from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def reset_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL.rstrip('/')}/platform/reset-password?uid={uid}&token={token}"


def send_password_reset(user, *, invite: bool = False) -> None:
    link = reset_link(user)
    hours = settings.PASSWORD_RESET_TIMEOUT // 3600
    if invite:
        subject = "Your PSGIM E-Cell platform account"
        intro = "An account has been created for you on the PSGIM E-Cell platform. Choose a password to sign in:"
    else:
        subject = "Reset your PSGIM E-Cell password"
        intro = "Someone (hopefully you) asked to reset the password for this account. Choose a new one here:"
    body = (
        f"Hello {user.full_name},\n\n{intro}\n\n{link}\n\n"
        f"The link works once and expires in {hours} hour{'s' if hours != 1 else ''}. "
        "If you did not expect this email, you can ignore it.\n\n— PSGIM E-Cell"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])
