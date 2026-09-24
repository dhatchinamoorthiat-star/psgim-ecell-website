"""
Approval invariants that do not depend on any particular content type.

Phase 2's content workflow (docs/07_CONTENT_WORKFLOW.md) must call
`check_approval` before recording any approval. It exists now so the rule
is tested from day one.
"""

from rest_framework.exceptions import PermissionDenied


class SelfApprovalDenied(PermissionDenied):
    default_detail = "You cannot approve content you authored."
    default_code = "self_approval"


class DuplicateStageApprover(PermissionDenied):
    default_detail = "The same person cannot satisfy two approval stages of one version."
    default_code = "duplicate_approver"


def check_approval(approver, *, author_ids, prior_stage_approver_ids=()) -> None:
    """
    Invariants 1 and 2 of the approval spec:
      1. the approver is not an author of the version being approved;
      2. the approver has not already approved another stage of it.
    Permission to approve (content.approve / content.approve_faculty) is a
    separate check through the policy engine.
    """
    if approver.pk in set(author_ids):
        raise SelfApprovalDenied()
    if approver.pk in set(prior_stage_approver_ids):
        raise DuplicateStageApprover()
