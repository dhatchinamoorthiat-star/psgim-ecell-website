from django.urls import path

from . import views

urlpatterns = [
    path("", views.VerticalListView.as_view(), name="vertical-list"),
    path("/<uuid:pk>", views.VerticalDetailView.as_view(), name="vertical-detail"),
    path("/<uuid:pk>/archive", views.VerticalArchiveView.as_view(), name="vertical-archive"),
]
