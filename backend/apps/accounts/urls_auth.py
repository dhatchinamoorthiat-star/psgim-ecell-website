from django.urls import path

from . import views_auth as v

urlpatterns = [
    path("csrf", v.CsrfView.as_view(), name="auth-csrf"),
    path("login", v.LoginView.as_view(), name="auth-login"),
    path("logout", v.LogoutView.as_view(), name="auth-logout"),
    path("me", v.MeView.as_view(), name="auth-me"),
    path("password/forgot", v.PasswordForgotView.as_view(), name="auth-password-forgot"),
    path("password/reset", v.PasswordResetView.as_view(), name="auth-password-reset"),
]
