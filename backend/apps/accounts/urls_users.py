from django.urls import path

from . import views_users as v

urlpatterns = [
    path("", v.UserListView.as_view(), name="user-list"),
    path("/<uuid:pk>", v.UserDetailView.as_view(), name="user-detail"),
    path("/<uuid:pk>/deactivate", v.UserDeactivateView.as_view(), name="user-deactivate"),
    path("/<uuid:pk>/reactivate", v.UserReactivateView.as_view(), name="user-reactivate"),
]
