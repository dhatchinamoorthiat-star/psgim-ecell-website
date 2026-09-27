from django.urls import path

from . import views

urlpatterns = [path("", views.OrganizationSettingsView.as_view(), name="organization-settings")]
