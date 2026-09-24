from django.urls import path

from . import views

urlpatterns = [
    path("academic-years", views.AcademicYearListView.as_view(), name="academic-year-list"),
    path("academic-years/<uuid:pk>/make-current", views.AcademicYearMakeCurrentView.as_view(), name="academic-year-make-current"),
    path("memberships", views.MembershipListView.as_view(), name="membership-list"),
    path("memberships/<uuid:pk>/end", views.MembershipEndView.as_view(), name="membership-end"),
]
