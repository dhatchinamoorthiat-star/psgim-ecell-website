from django.urls import path

from . import views

urlpatterns = [
    path("permissions", views.PermissionListView.as_view(), name="permission-list"),
    path("roles", views.RoleListView.as_view(), name="role-list"),
    path("role-assignments", views.RoleAssignmentListView.as_view(), name="role-assignment-list"),
    path("role-assignments/<uuid:pk>/revoke", views.RoleAssignmentRevokeView.as_view(), name="role-assignment-revoke"),
]
