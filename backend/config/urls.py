from django.urls import include, path

from apps.core.views import SchemaView, SwaggerView

api_v1 = [
    path("auth/", include("apps.accounts.urls_auth")),
    path("users", include("apps.accounts.urls_users")),
    path("", include("apps.rbac.urls")),
    path("verticals", include("apps.verticals.urls")),
    path("", include("apps.memberships.urls")),
    path("audit", include("apps.audit.urls")),
    path("settings", include("apps.core.urls")),
    path("content", include("apps.content.urls")),
    path("join", include("apps.join.urls")),
    path("public", include("apps.join.urls_public")),
    path("schema", SchemaView.as_view(), name="schema"),
    path("docs", SwaggerView.as_view(url_name="schema"), name="swagger"),
]

# There is deliberately no Django admin site: it would be a second way to
# change roles that bypasses the RBAC policy engine and the audit log.
urlpatterns = [path("api/v1/", include(api_v1))]
