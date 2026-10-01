/**
 * Phase 2D approval-workflow UI types. Mirror backend/apps/content
 * serializers exactly (ReviewInboxItemSerializer, ApprovalSerializer,
 * ContentVersionSerializer) — the UI never invents fields the server
 * doesn't send.
 */

/** One row of GET /content/inbox — a version the viewer may act on next. */
export interface ReviewInboxItem {
  id: string;
  number: number;
  state: WorkflowState;
  content_item_id: string;
  content_type: string;
  slug: string;
  owner_vertical: string | null;
  author_email: string;
  change_note: string;
  updated_at: string;
  pending_action: 'open_review' | 'approve';
}

/** One row of GET /content/versions/:id/approvals — a recorded decision. */
export interface ApprovalRecord {
  id: string;
  content_version: string;
  stage_index: number;
  stage_kind: string;
  approver_email: string;
  decision: 'approved' | 'changes_requested';
  comment: string;
  created_at: string;
}

export type WorkflowState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export const WORKFLOW_STATE_LABELS: Record<WorkflowState, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};
