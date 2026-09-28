from django.urls import path

from . import views

urlpatterns = [
    path("", views.ContentItemListView.as_view(), name="content-item-list"),
    path("/mine", views.MyContentVersionsListView.as_view(), name="content-version-mine"),
    path("/<uuid:pk>", views.ContentItemDetailView.as_view(), name="content-item-detail"),
    path("/<uuid:pk>/unpublish", views.ContentItemUnpublishView.as_view(), name="content-item-unpublish"),
    path("/<uuid:pk>/revert", views.ContentItemRevertView.as_view(), name="content-item-revert"),
    path("/versions/<uuid:pk>", views.ContentVersionDetailView.as_view(), name="content-version-detail"),
    path("/versions/<uuid:pk>/new-draft", views.ContentVersionNewDraftView.as_view(), name="content-version-new-draft"),
    path("/versions/<uuid:pk>/submit", views.ContentVersionSubmitView.as_view(), name="content-version-submit"),
    path("/versions/<uuid:pk>/review", views.ContentVersionOpenReviewView.as_view(), name="content-version-review"),
    path(
        "/versions/<uuid:pk>/request-changes",
        views.ContentVersionRequestChangesView.as_view(),
        name="content-version-request-changes",
    ),
    path("/versions/<uuid:pk>/approve", views.ContentVersionApproveView.as_view(), name="content-version-approve"),
    path("/versions/<uuid:pk>/schedule", views.ContentVersionScheduleView.as_view(), name="content-version-schedule"),
    path("/versions/<uuid:pk>/publish", views.ContentVersionPublishView.as_view(), name="content-version-publish"),
    path("/versions/<uuid:pk>/approvals", views.ApprovalHistoryView.as_view(), name="content-version-approvals"),
    path("/approval-rules", views.ApprovalRuleListView.as_view(), name="approval-rule-list"),
    path("/block-types", views.ContentBlockTypeListView.as_view(), name="content-block-type-list"),
    path("/media", views.MediaAssetListView.as_view(), name="media-asset-list"),
    path("/media/upload-params", views.MediaUploadParamsView.as_view(), name="media-upload-params"),
    path("/public/dynamic/<str:query_id>", views.PublicDynamicQueryView.as_view(), name="public-dynamic-query"),
    path("/public/<str:content_type>/<slug:slug>", views.PublicContentDetailView.as_view(), name="public-content-detail"),
]
