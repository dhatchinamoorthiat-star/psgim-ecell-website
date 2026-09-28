"""
End-to-end content workflow through the API (docs/07_CONTENT_WORKFLOW.md,
docs/18_TESTING_STRATEGY.md). Mirrors apps/rbac/tests style: real HTTP
requests via `client_for`, asserting status codes and audit rows.
"""


import pytest
from rest_framework.test import APIRequestFactory

from apps.audit.models import AuditLog
from apps.content import workflow
from apps.content.block_catalogue import BLOCK_TYPES
from apps.content.models import Approval, ApprovalRule, ContentBlockType, ContentItem, ContentVersion, MediaAsset, WorkflowState
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
    # No owner_vertical_id -> GLOBAL scope, which head_a does not hold.
    r = head.get("/api/v1/content/media/upload-params")
    assert r.status_code == 403

    r = head.get(f"/api/v1/content/media/upload-params?owner_vertical_id={org['vertical_a'].pk}")
    # Cloudinary isn't configured in tests -> 503, not 403: permission was granted.
    assert r.status_code == 503


# --- media authorization (gate-review fixes) -------------------------------------------


def _head_of_b(org):
    """The default `org` fixture only seeds a VERTICAL_HEAD for vertical A; grant one
    for B so the media-scope tests can compare two symmetric authorities."""
    grant(org["member_b"], "VERTICAL_HEAD", org["vertical_b"])
    return org["member_b"]


def test_media_cross_vertical_list_blocked(org):
    head_a, head_b = org["head_a"], _head_of_b(org)
    MediaAsset.objects.create(
        cloudinary_public_id="a-only", delivery_url="https://x.com/a.jpg", uploaded_by=head_a, owner_vertical=org["vertical_a"]
    )
    r = client_for(head_b).get("/api/v1/content/media")
    assert r.status_code == 200
    assert all(m["id"] for m in r.data["results"])
    assert not any(m["cloudinary_public_id"] == "a-only" for m in r.data["results"])
    # And vertical A's own head does see it.
    r = client_for(head_a).get("/api/v1/content/media")
    assert any(m["cloudinary_public_id"] == "a-only" for m in r.data["results"])


def test_media_creation_with_forged_owner_vertical_blocked(org):
    head_b = _head_of_b(org)
    body = {"cloudinary_public_id": "forged", "delivery_url": "https://x.com/f.jpg", "owner_vertical_id": str(org["vertical_a"].pk)}
    r = client_for(head_b).post("/api/v1/content/media", body, format="json")
    assert r.status_code == 403
    assert not MediaAsset.objects.filter(cloudinary_public_id="forged").exists()


def test_media_creation_within_own_scope_succeeds(org):
    head_a = org["head_a"]
    body = {"cloudinary_public_id": "legit", "delivery_url": "https://x.com/l.jpg", "owner_vertical_id": str(org["vertical_a"].pk)}
    r = client_for(head_a).post("/api/v1/content/media", body, format="json")
    assert r.status_code == 201, r.data
    assert MediaAsset.objects.get(cloudinary_public_id="legit").owner_vertical_id == org["vertical_a"].pk


def test_media_upload_params_folder_is_scope_derived_not_client_controlled(org):
    """The old endpoint took a free `folder` query param; it must no longer exist —
    the folder is derived server-side from a *verified* scope only."""
    head_a = org["head_a"]
    r = client_for(head_a).get(f"/api/v1/content/media/upload-params?owner_vertical_id={org['vertical_a'].pk}")
    assert r.status_code == 503  # Cloudinary unconfigured in tests, but permission was checked first
    # Requesting another vertical's scope is refused outright, regardless of any folder value supplied.
    r = client_for(head_a).get(
        f"/api/v1/content/media/upload-params?owner_vertical_id={org['vertical_b'].pk}&folder=whatever-vertical-b-private"
    )
    assert r.status_code == 403


def test_member_cannot_upload_into_arbitrary_vertical_folder(org):
    member_b = org["member_b"]  # MEMBER, own_only media.upload — no vertical-scoped grant at all
    r = client_for(member_b).get(f"/api/v1/content/media/upload-params?owner_vertical_id={org['vertical_a'].pk}")
    assert r.status_code == 403


def test_unauthorized_media_access_does_not_leak_existence(org):
    """An outsider probing media endpoints gets a flat permission refusal, never a
    distinguishable "exists but you can't see it" vs. "doesn't exist" signal."""
    outsider = client_for(org["outsider"])
    r = outsider.get("/api/v1/content/media")
    assert r.status_code == 403
    r = outsider.post("/api/v1/content/media", {"cloudinary_public_id": "x", "delivery_url": "https://x.com/x.jpg"}, format="json")
    assert r.status_code == 403


# --- version-numbering concurrency -------------------------------------------------


def test_create_draft_locks_the_content_item_row(org):
    """
    A real multi-connection race (two threads racing `create_draft` against
    the same `ContentItem`) needs `@pytest.mark.django_db(transaction=True)`
    to get independent connections/visibility — but this codebase's audit
    log is enforced append-only by a Postgres trigger
    (`apps/audit/migrations`, review finding F8), which makes Django's
    `flush`-based teardown for `transaction=True` tests fail outright
    ("audit_auditlog is append-only: TRUNCATE is not permitted") on *any*
    test that writes an audit row — every workflow call does. Weakening
    that trigger to make threaded tests convenient is exactly the kind of
    "silently weaken an existing security control" this remediation pass
    is forbidden from doing.

    So this test instead proves the concurrency-safety *mechanism* itself
    is in place deterministically: `create_draft` must issue a `SELECT ...
    FOR UPDATE` against `content_contentitem` before computing the next
    version number, which is what makes two real concurrent callers
    serialize instead of racing to the same number.
    """
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    item = ContentItem.objects.create(
        content_type="page", slug="race-page", owner_vertical=org["vertical_a"], created_by=org["head_a"]
    )
    factory = APIRequestFactory()
    req = factory.post("/")
    req.user = org["head_a"]

    with CaptureQueriesContext(connection) as queries:
        version = workflow.create_draft(req, content_item=item, blocks=_valid_blocks())

    assert version.number == 1
    locking_queries = [
        q["sql"] for q in queries.captured_queries
        if "content_contentitem" in q["sql"] and "FOR UPDATE" in q["sql"].upper()
    ]  # fmt: skip
    assert locking_queries, f"no SELECT ... FOR UPDATE on content_contentitem found in: {[q['sql'] for q in queries.captured_queries]}"

    # A second call against the same item still serializes correctly to the next number.
    version2 = workflow.create_draft(req, content_item=item, blocks=_valid_blocks())
    assert version2.number == 2
    assert ContentVersion.objects.filter(content_item=item).count() == 2


# --- accessibility gate at publish -------------------------------------------------


def _image_blocks(image_prop: dict) -> dict:
    return {"schema_version": 1, "blocks": [{"id": "h1", "type": "hero", "props": {"heading": "Hi", "image": image_prop}}]}


def _publish_flow(head, admin, blocks: dict, *, slug: str):
    body = {"content_type": "page", "slug": slug, "blocks": blocks}  # GLOBAL-scoped item
    r = head.post("/api/v1/content", body, format="json")
    assert r.status_code == 201, r.data
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")
    approve = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    assert approve.status_code == 200, approve.data
    return admin.post(f"/api/v1/content/versions/{draft.id}/publish", {}, format="json")


def test_publish_rejected_when_image_missing_alt_text(org):
    head, admin = client_for(org["super_admin"]), client_for(org["super_admin_2"])
    blocks = _image_blocks({"source": "external", "url": "https://x.com/a.jpg"})
    r = _publish_flow(head, admin, blocks, slug="no-alt-page")
    assert r.status_code == 400
    assert not ContentItem.objects.get(slug="no-alt-page").published_version_id


def test_publish_succeeds_with_valid_image_and_alt_text(org):
    head, admin = client_for(org["super_admin"]), client_for(org["super_admin_2"])
    blocks = _image_blocks({"source": "external", "url": "https://x.com/a.jpg", "alt": "A campus photo"})
    r = _publish_flow(head, admin, blocks, slug="with-alt-page")
    assert r.status_code == 200 and r.data["state"] == WorkflowState.PUBLISHED


def test_publish_resolves_media_reference_and_requires_asset_alt_text(org):
    asset = MediaAsset.objects.create(
        cloudinary_public_id="p", delivery_url="https://x.com/p.jpg", uploaded_by=org["super_admin"]
    )
    head, admin = client_for(org["super_admin"]), client_for(org["super_admin_2"])
    blocks = _image_blocks({"source": "media", "asset_id": str(asset.id)})
    r = _publish_flow(head, admin, blocks, slug="media-no-alt")
    assert r.status_code == 400

    asset.alt_text = "A campus photo"
    asset.save(update_fields=["alt_text"])
    r2 = _publish_flow(head, admin, blocks, slug="media-with-alt")
    assert r2.status_code == 200 and r2.data["state"] == WorkflowState.PUBLISHED


# --- workflow: open_review audit ----------------------------------------------------


def test_open_review_writes_audit_row(org):
    head = client_for(org["head_a"])
    r = _create_item(head, owner_vertical=org["vertical_a"], slug="review-audit-page")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    assert not AuditLog.objects.filter(action="content.review_opened", target_id=str(draft.id)).exists()
    head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")
    row = AuditLog.objects.get(action="content.review_opened", target_id=str(draft.id))
    assert row.actor_id == org["head_a"].id
    assert row.before == {"state": "SUBMITTED"}
    assert row.after == {"state": "IN_REVIEW"}


# --- approval-stage snapshot (Invariant 5) ------------------------------------------


def test_approval_stages_are_snapshotted_at_submit_and_rule_changes_do_not_alter_in_flight_review(org):
    rule = ApprovalRule.objects.create(
        name="Org only", content_type="page",
        stages=[{"kind": "ORGANIZATIONAL", "permission": "content.approve", "scope": "GLOBAL", "min_approvers": 1}],
    )  # fmt: skip
    r = _create_item(client_for(org["head_a"]), owner_vertical=org["vertical_a"], slug="snapshot-page")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head = client_for(org["head_a"])
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")

    draft.refresh_from_db()
    assert draft.approval_stages_snapshot == [
        {"kind": "ORGANIZATIONAL", "permission": "content.approve", "scope": "GLOBAL", "min_approvers": 1}
    ]

    # Now tighten the rule to also require FACULTY approval, *after* submission.
    rule.stages = [
        {"kind": "ORGANIZATIONAL", "permission": "content.approve", "scope": "GLOBAL", "min_approvers": 1},
        {"kind": "FACULTY", "permission": "content.approve_faculty", "scope": "GLOBAL", "min_approvers": 1},
    ]
    rule.save(update_fields=["stages"])

    head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")
    admin = client_for(org["admin_head"])
    r = admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")
    # The in-flight version still only needs its original ORGANIZATIONAL-only
    # snapshot — one approval satisfies it, even though the live rule now
    # requires two stages.
    assert r.status_code == 200 and r.data["state"] == WorkflowState.APPROVED

    # A *new* submission made after the rule change gets the new, stricter snapshot.
    r2 = _create_item(client_for(org["head_a"]), owner_vertical=org["vertical_a"], slug="post-change-page")
    item2 = ContentItem.objects.get(pk=r2.data["id"])
    draft2 = item2.draft_version
    head.post(f"/api/v1/content/versions/{draft2.id}/submit", {}, format="json")
    draft2.refresh_from_db()
    assert [s["kind"] for s in draft2.approval_stages_snapshot] == ["ORGANIZATIONAL", "FACULTY"]


# --- RBAC: own-only member content path ---------------------------------------------


def test_member_can_read_and_list_own_authored_draft(org):
    """A MEMBER holds only own_only content.submit (catalogue.py) — no content.view
    anywhere — so their only read path is /content/mine and the version-detail
    own-author exception, not the item/version list endpoints."""
    member_a = org["member_a"]
    item = ContentItem.objects.create(content_type="blog", slug="member-blog", owner_vertical=org["vertical_a"], created_by=member_a)
    factory = APIRequestFactory()
    req = factory.post("/")
    req.user = member_a
    version = workflow.create_draft(req, content_item=item, blocks=_valid_blocks())

    client = client_for(member_a)
    r = client.get("/api/v1/content/mine")
    assert r.status_code == 200
    assert any(v["id"] == str(version.id) for v in r.data["results"])

    r = client.get(f"/api/v1/content/versions/{version.id}")
    assert r.status_code == 200

    r = client.patch(f"/api/v1/content/versions/{version.id}", {"blocks": _valid_blocks()}, format="json")
    assert r.status_code == 200


def test_member_cannot_access_another_members_content(org):
    member_a, member_b = org["member_a"], org["member_b"]
    item = ContentItem.objects.create(content_type="blog", slug="a-private-blog", owner_vertical=org["vertical_a"], created_by=member_a)
    factory = APIRequestFactory()
    req = factory.post("/")
    req.user = member_a
    version = workflow.create_draft(req, content_item=item, blocks=_valid_blocks())

    client_b = client_for(member_b)
    r = client_b.get("/api/v1/content/mine")
    assert r.status_code == 200
    assert not any(v["id"] == str(version.id) for v in r.data["results"])

    r = client_b.get(f"/api/v1/content/versions/{version.id}")
    assert r.status_code == 404  # no existence leak

    r = client_b.patch(f"/api/v1/content/versions/{version.id}", {"blocks": _valid_blocks()}, format="json")
    assert r.status_code == 404  # get_version()'s scope check runs before the submit-permission check


# --- approval history endpoint -------------------------------------------------------


def test_approval_history_visible_to_authorized_scope_only(org):
    r = _create_item(client_for(org["head_a"]), owner_vertical=org["vertical_a"], slug="history-page")
    item = ContentItem.objects.get(pk=r.data["id"])
    draft = item.draft_version
    head = client_for(org["head_a"])
    head.post(f"/api/v1/content/versions/{draft.id}/submit", {}, format="json")
    head.post(f"/api/v1/content/versions/{draft.id}/review", {}, format="json")
    admin = client_for(org["admin_head"])
    admin.post(f"/api/v1/content/versions/{draft.id}/approve", {}, format="json")

    assert Approval.objects.filter(content_version=draft).exists()

    r = admin.get(f"/api/v1/content/versions/{draft.id}/approvals")
    assert r.status_code == 200
    assert len(r.data["results"]) == 1
    entry = r.data["results"][0]
    assert entry["decision"] == "approved" and entry["stage_kind"] == "ORGANIZATIONAL"
    assert entry["approver_email"] == org["admin_head"].email

    # head_a authored the draft, so they may read its own history too.
    r = head.get(f"/api/v1/content/versions/{draft.id}/approvals")
    assert r.status_code == 200

    # An outsider with no scope over vertical A gets no existence leak.
    grant(org["member_b"], "VERTICAL_HEAD", org["vertical_b"])
    r = client_for(org["member_b"]).get(f"/api/v1/content/versions/{draft.id}/approvals")
    assert r.status_code == 404
