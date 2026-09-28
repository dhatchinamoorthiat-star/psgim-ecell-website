"""
The content workflow state machine (docs/07_CONTENT_WORKFLOW.md,
docs/21_CMS_WORKFLOW.md). Views must call these functions — nothing else
constructs `ContentVersion`/`Approval` rows or advances `state`.

Every transition: permission check via `apps.rbac.policy` (never role-name
comparisons), an audit row via `apps.audit.service.record`, wrapped in
`transaction.atomic()` so a change never commits without its audit row
(matches the pattern documented in `apps/audit/service.py`).
"""

from django.db import transaction
from django.utils import timezone

from apps.audit import service as audit
from apps.core.exceptions import Conflict
from apps.rbac import catalogue as P
from apps.rbac import policy
from apps.rbac.approvals import check_approval

from .models import Approval, ContentBlockType, ContentItem, ContentVersion, WorkflowState
from .validation import validate_blocks_document, validate_image_accessibility

_DEFAULT_RULE_STAGES = [
    {"kind": "ORGANIZATIONAL", "permission": P.CONTENT_APPROVE, "scope": "GLOBAL", "min_approvers": 1}
]


def _active_block_types() -> dict:
    return {bt.key: bt for bt in ContentBlockType.objects.filter(is_active=True)}


def create_draft(request, *, content_item: ContentItem, blocks: dict, seo: dict | None = None, change_note: str = ""):
    """
    Create the first or a new draft version. Requires `content.view` (coarse
    gate; the real authoring gate is `content.submit`/`content.review` etc.
    depending on what happens next).

    Locks the parent `ContentItem` row (`select_for_update`) before reading
    the current max version number, so two concurrent calls against the
    same item (double-submit, two tabs, a future autosave race) serialize
    correctly instead of racing to the same `next_number` and hitting the
    `unique_version_number_per_item` constraint as an unhandled 500. The
    second caller simply waits for the lock, then computes its number
    against the first caller's now-committed version.
    """
    validate_blocks_document(blocks, _active_block_types())
    with transaction.atomic():
        locked_item = ContentItem.objects.select_for_update().get(pk=content_item.pk)
        next_number = (locked_item.versions.aggregate(n=_max_number())["n"] or 0) + 1
        version = ContentVersion.objects.create(
            content_item=locked_item,
            number=next_number,
            state=WorkflowState.DRAFT,
            blocks=blocks,
            seo=seo or {},
            author=request.user,
            change_note=change_note,
        )
        locked_item.draft_version = version
        locked_item.state = WorkflowState.DRAFT
        locked_item.save(update_fields=["draft_version", "state", "updated_at"])
        audit.record(
            request, "content.version_created", summary=f"Created draft v{version.number} of {locked_item}",
            target=version, after={"blocks": blocks},
        )  # fmt: skip
        # Keep the caller's in-memory instance consistent with what was just committed.
        content_item.draft_version = version
        content_item.draft_version_id = version.id
        content_item.state = WorkflowState.DRAFT
        return version


def _max_number():
    from django.db.models import Max

    return Max("number")


def update_draft(request, *, version: ContentVersion, blocks: dict, seo: dict | None = None, change_note: str = ""):
    if version.state != WorkflowState.DRAFT:
        raise Conflict("Only a DRAFT version can be edited in place.")
    validate_blocks_document(blocks, _active_block_types())
    with transaction.atomic():
        version.blocks = blocks
        if seo is not None:
            version.seo = seo
        version.change_note = change_note or version.change_note
        version.save(update_fields=["blocks", "seo", "change_note", "updated_at"])
        audit.record(request, "content.updated", summary=f"Updated draft {version}", target=version, after={"blocks": blocks})
        return version


def submit(request, *, version: ContentVersion):
    if version.state != WorkflowState.DRAFT:
        raise Conflict(f"Cannot submit from state {version.state}.")
    with transaction.atomic():
        version.state = WorkflowState.SUBMITTED
        # Resolve and freeze the required stages now (Invariant 5): a later
        # ApprovalRule change must not silently alter what this in-flight
        # version needs. `approve()` reads this snapshot, never a live query.
        version.approval_stages_snapshot = _resolve_stages(version.content_item)
        version.save(update_fields=["state", "approval_stages_snapshot", "updated_at"])
        version.content_item.state = version.state
        version.content_item.save(update_fields=["state", "updated_at"])
        audit.record(request, "content.submitted", summary=f"Submitted {version} for review", target=version)
        return version


def open_review(request, *, version: ContentVersion):
    if version.state != WorkflowState.SUBMITTED:
        raise Conflict(f"Cannot open review from state {version.state}.")
    with transaction.atomic():
        before_state = WorkflowState.SUBMITTED
        version.state = WorkflowState.IN_REVIEW
        version.save(update_fields=["state", "updated_at"])
        version.content_item.state = version.state
        version.content_item.save(update_fields=["state", "updated_at"])
        audit.record(
            request, "content.review_opened", summary=f"Opened review on {version}", target=version,
            before={"state": before_state}, after={"state": version.state},
        )  # fmt: skip
        return version


def request_changes(request, *, version: ContentVersion, comment: str):
    if version.state != WorkflowState.IN_REVIEW:
        raise Conflict(f"Cannot request changes from state {version.state}.")
    if not comment:
        raise Conflict("A comment is required to request changes.")
    with transaction.atomic():
        Approval.objects.create(
            content_version=version, stage_index=0, stage_kind="ORGANIZATIONAL",
            approver=request.user, decision=Approval.Decision.CHANGES_REQUESTED, comment=comment,
        )  # fmt: skip
        version.state = WorkflowState.CHANGES_REQUESTED
        version.save(update_fields=["state", "updated_at"])
        version.content_item.state = version.state
        version.content_item.save(update_fields=["state", "updated_at"])
        audit.record(request, "content.rejected", summary=f"Requested changes on {version}: {comment}", target=version)
        return version


def _resolve_stages(item: ContentItem) -> list[dict]:
    """Union of every active matching ApprovalRule's stages; strictest wins per kind
    (max min_approvers). Falls back to the default single-ORGANIZATIONAL-stage rule."""
    from .models import ApprovalRule

    matched = [r for r in ApprovalRule.objects.filter(is_active=True) if _rule_matches(r, item)]
    if not matched:
        return _DEFAULT_RULE_STAGES
    by_kind: dict[str, dict] = {}
    for rule in matched:
        for stage in rule.stages:
            existing = by_kind.get(stage["kind"])
            if existing is None or stage.get("min_approvers", 1) > existing.get("min_approvers", 1):
                by_kind[stage["kind"]] = stage
    # ORGANIZATIONAL before FACULTY, matching the illustrative sequence in docs/21.
    order = {"ORGANIZATIONAL": 0, "FACULTY": 1}
    return sorted(by_kind.values(), key=lambda s: order.get(s["kind"], 99))


def _rule_matches(rule, item: ContentItem) -> bool:
    if rule.content_type and rule.content_type != item.content_type:
        return False
    if rule.owner_vertical_id and rule.owner_vertical_id != item.owner_vertical_id:
        return False
    return True


def approve(request, *, version: ContentVersion, comment: str = ""):
    if version.state != WorkflowState.IN_REVIEW:
        raise Conflict(f"Cannot approve from state {version.state}.")
    # Use the stages frozen at submit time, never a live ApprovalRule query —
    # Invariant 5 (docs/07_CONTENT_WORKFLOW.md): a rule change mid-review must
    # not silently alter what this specific in-flight version needs.
    stages = version.approval_stages_snapshot or _DEFAULT_RULE_STAGES
    prior_approvers = list(
        Approval.objects.filter(content_version=version, decision=Approval.Decision.APPROVED).values_list(
            "approver_id", flat=True
        )
    )
    check_approval(request.user, author_ids=[version.author_id], prior_stage_approver_ids=prior_approvers)
    stage_index = len(prior_approvers)
    if stage_index >= len(stages):
        raise Conflict("All required approval stages are already satisfied.")
    stage = stages[stage_index]
    _require_stage_permission(request, stage, version)
    with transaction.atomic():
        Approval.objects.create(
            content_version=version, stage_index=stage_index, stage_kind=stage["kind"],
            approver=request.user, decision=Approval.Decision.APPROVED, comment=comment,
        )  # fmt: skip
        satisfied = stage_index + 1 >= len(stages)
        if satisfied:
            version.state = WorkflowState.APPROVED
            version.save(update_fields=["state", "updated_at"])
            version.content_item.state = version.state
            version.content_item.save(update_fields=["state", "updated_at"])
            audit.record(request, "content.approved", summary=f"Approved {version} (all stages satisfied)", target=version)
        else:
            audit.record(request, "content.approved", summary=f"Stage {stage_index} approved on {version}", target=version)
        return version


def _require_stage_permission(request, stage: dict, version: ContentVersion) -> None:
    perm = stage["permission"]
    scope_obj = version.content_item if stage.get("scope") == "OWNER_VERTICAL" else None
    if not policy.has_perm(request.user, perm, scope_obj):
        from apps.rbac.services import deny

        deny(request, perm, f"Refused: {request.user.email} lacks {perm} to approve this content.", target=version)
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied()


def schedule(request, *, version: ContentVersion, publish_at):
    if version.state != WorkflowState.APPROVED:
        raise Conflict(f"Cannot schedule from state {version.state}.")
    if publish_at <= timezone.now():
        raise Conflict("publish_at must be in the future.")
    with transaction.atomic():
        version.state = WorkflowState.SCHEDULED
        version.save(update_fields=["state", "updated_at"])
        version.content_item.state = version.state
        version.content_item.publish_at = publish_at
        version.content_item.save(update_fields=["state", "publish_at", "updated_at"])
        audit.record(request, "content.scheduled", summary=f"Scheduled {version} for {publish_at}", target=version)
        return version


def publish(request, *, version: ContentVersion):
    """
    Swaps the published pointer and audits. Does NOT trigger any build or
    Cloudflare deploy — that is the Phase 2D/2E deployment abstraction,
    deliberately out of scope here (task §20: saving/publishing/deploying
    are distinct concerns).

    Gates on accessibility (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Image
    props"): every `image` prop in the document must resolve to non-empty
    alt text before this version can go live. This is checked here, not at
    draft-save time, so an editor can save a draft with a picked image
    before writing the caption.
    """
    if version.state not in (WorkflowState.APPROVED, WorkflowState.SCHEDULED):
        raise Conflict(f"Cannot publish from state {version.state}.")
    validate_image_accessibility(version.blocks, _active_block_types())
    with transaction.atomic():
        version.state = WorkflowState.PUBLISHED
        version.save(update_fields=["state", "updated_at"])
        item = version.content_item
        item.published_version = version
        if item.draft_version_id == version.id:
            item.draft_version = None
        item.state = version.state
        item.save(update_fields=["published_version", "draft_version", "state", "updated_at"])
        audit.record(request, "content.published", summary=f"Published {version}", target=version)
        return version


def unpublish(request, *, item: ContentItem):
    version = item.published_version
    if version is None or version.state != WorkflowState.PUBLISHED:
        raise Conflict("This item has no published version.")
    with transaction.atomic():
        version.state = WorkflowState.ARCHIVED
        version.save(update_fields=["state", "updated_at"])
        item.published_version = None
        item.state = version.state
        item.save(update_fields=["published_version", "state", "updated_at"])
        audit.record(request, "content.unpublished", summary=f"Unpublished {version}", target=version)
        return version


def revert(request, *, item: ContentItem, source_version: ContentVersion):
    """Rollback = copy an old version into a new DRAFT (history is never rewritten)."""
    if source_version.content_item_id != item.id:
        raise Conflict("Version does not belong to this item.")
    new_version = create_draft(
        request, content_item=item, blocks=source_version.blocks, seo=source_version.seo,
        change_note=f"Reverted to v{source_version.number}",
    )  # fmt: skip
    audit.record(request, "content.reverted", summary=f"Reverted {item} to v{source_version.number}", target=new_version)
    return new_version
