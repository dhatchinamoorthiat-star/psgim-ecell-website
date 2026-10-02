from django.urls import path

from . import views

urlpatterns = [
    path("/join", views.JoinSubmitView.as_view(), name="join-submit"),
]
