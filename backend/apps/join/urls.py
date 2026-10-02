from django.urls import path

from . import views

urlpatterns = [
    path("/submissions", views.JoinSubmissionListView.as_view(), name="join-submission-list"),
    path("/submissions/<uuid:pk>/handled", views.JoinSubmissionHandledView.as_view(), name="join-submission-handled"),
]
