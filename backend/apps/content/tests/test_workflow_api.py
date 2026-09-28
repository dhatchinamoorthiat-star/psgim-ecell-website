"""
End-to-end content workflow through the API (docs/07_CONTENT_WORKFLOW.md,
docs/18_TESTING_STRATEGY.md). Mirrors apps/rbac/tests style: real HTTP
requests via `client_for`, asserting status codes and audit rows.
"""

import pytest

from apps.audit.models import AuditLog
from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.models import ApprovalRule, ContentBlockType, ContentItem, WorkflowState
from conftest import client_for, grant

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _block_types(db):
    for spec in BLOCK_TYPES:
        ContentBlockType.objects.create(
            key=spec["key"], label=spec["label"], json_schema=spec["json_schema"],
            allowed_parent_keys=spec["allowed_parent_keys"],
        )  # fmt: skip


def _valid_blocks():
    return {"schema_version": 1, "blocks": [{"id": "h1", "type": "hero", "props": {"heading": "Hello"}}]}


def _create_item(client, *, owner_vertical=None, slug="about"):
    body = {"content_type": "page", "slug": slug, "blocks": _valid_blocks()}
    if owner_vertical is not None:
        body["owner_vertical_id"] = str(owner_vertical.pk)
    return client.post("/api/v1/content", body, format="json")


def test_create_draft_submit_approve_publish_and_public_read(org):
    head = client_for(org["head_a"])
    r = _create_item(head, owner_vertical=org["vertical_a"])
    assert r.status_code == 201, r.data
    item_id = r.data["id"]
    item = ContentItem.objects.get(pk=item_id)
    draft = item.draft_version
    assert draft.state == WorkflowState.DRAFT

    r = head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.SUBMITTED

    r = head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.IN_REVIEW

    # head_a authored the draft; self-approval must be refused (invariant 1).
    r = head.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 403

    admin = client_for(org["admin_head"])
    r = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.APPROVED

    r = admin.post(f"/api/v1/content/versions/{draft.id}/publish", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.PUBLISHED

    anon_client = client_for(None)
    r = anon_client.get("/api/v1/content/public/page/about")
    assert r.status_code == 200
    assert r.data["blocks"]["blocks"][0]["props"]["heading"] == "Hello"

    assert AuditLog.objects.filter(action="content.published").exists()
    assert AuditLog.objects.filter(action="content.approved").exists()


def test_draft_content_never_reachable_publicly(org):
    head = client_for(org["head_a"])
    _create_item(head, owner_vertical=org["vertical_a"], slug="unpublished-page")
    anon = client_for(None)
    r = anon.get("/api/v1/content/public/page/unpublished-page")
    assert r.status_code == 404


def test_illegal_transition_is_conflict(org):
    head = client_for(org["head_a"])
    r = _create_item(head, owner_vertical=org["vertical_a"], slug="draft-only")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    # Cannot approve straight from DRAFT (must go through SUBMITTED/IN_REVIEW).
    admin = client_for(org["admin_head"])
    r = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 409


def test_draft_immutable_after_submit(org):
    head = client_for(org["head_a"])
    r = _create_item(head, owner_vertical=org["vertical_a"], slug="locked-page")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    r = head.patch(f"/api/v1/content/versions/{draft.id}", {"blocks": _valid_blocks()}, format="json")
    assert r.status_code == 409


def test_cross_vertical_editing_is_refused(org):
    r = _create_item(client_for(org["head_a"]), owner_vertical=org["vertical_a"], slug="a-only")
    item_id = r.data["id"]
    # A plain MEMBER never holds content.view at all (catalogue.py), so an
    # outsider with no vertical content authority is refused before scope is
    # even considered. To test scope isolation specifically (not just "no
    # permission at all"), grant member_b a VERTICAL_HEAD role in vertical B
    # — they hold content.view, but only scoped to B, not A.
    grant(org["member_b"], "VERTICAL_HEAD", org["vertical_b"])
    head_of_b = client_for(org["member_b"])
    r = head_of_b.get(f"/api/v1/content/{item_id}")
    assert r.status_code == 404  # no existence leak outside scope


def test_invalid_block_document_rejected(org):
    head = client_for(org["head_a"])
    body = {
        "content_type": "page", "slug": "bad-page", "owner_vertical_id": str(org["vertical_a"].pk),
        "blocks": {"schema_version": 1, "blocks": [{"id": "x", "type": "raw_html", "props": {}}]},
    }  # fmt: skip
    r = head.post("/api/v1/content", body, format="json")
    assert r.status_code == 400


def test_faculty_stage_requires_distinct_approver_and_permission(org):
    ApprovalRule.objects.create(
        name="Pages need faculty approval", content_type="page",
        stages=[
            {"kind": "ORGANIZATIONAL", "permission": "content.approve", "scope": "GLOBAL", "min_approvers": 1},
            {"kind": "FACULTY", "permission": "content.approve_faculty", "scope": "GLOBAL", "min_approvers": 1},
        ],
    )  # fmt: skip
    r = _create_item(client_for(org["head_a"]), owner_vertical=org["vertical_a"], slug="needs-faculty")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head = client_for(org["head_a"])
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")

    admin = client_for(org["admin_head"])
    r = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.IN_REVIEW  # still waiting on FACULTY stage

    # admin_head already satisfied the ORGANIZATIONAL stage; the same person
    # can't also satisfy FACULTY (invariant 2), and separately lacks
    # content.approve_faculty entirely — either reason yields 403.
    r = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 403

    faculty_user = org["outsider"]
    grant(faculty_user, "FACULTY_ADVISOR")
    faculty = client_for(faculty_user)
    r = faculty.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.APPROVED


def test_media_upload_requires_permission(org):
    outsider = client_for(org["outsider"])
    r = outsider.get("/api/v1/content/media/upload-params")
    assert r.status_code == 403

    head = client_for(org["head_a"])
    r = head.get("/api/v1/content/media/upload-params")
    # Cloudinary isn't configured in tests -> 503, not 403: permission was granted.
    assert r.status_code == 503
