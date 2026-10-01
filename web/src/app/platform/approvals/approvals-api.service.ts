import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Page } from '../core/api.types';
import { ContentVersionRecord } from '../editor/editor.types';
import { ApprovalRecord, ReviewInboxItem } from './approvals.types';

/**
 * Phase 2D approval-workflow API surface — submit/review/approve/reject/
 * publish, plus the reviewer inbox and "my submissions" lists. Same
 * `/api/v1` base and session/CSRF handling as `EditorApiService`; kept
 * separate because this is a different page family (approvals, not the
 * editor canvas) with its own provider scope, per this codebase's
 * one-service-per-page-tree convention.
 *
 * Every action here is re-authorized server-side by
 * `apps.content.workflow` — this service never decides whether an action
 * is allowed, only shapes the request and surfaces the server's decision
 * (a 403/409 from `ApiService` propagates as an `ApiError`).
 */
@Injectable()
export class ApprovalsApiService {
  private api = inject(ApiService);

  inbox = (page = 1) => this.api.get<Page<ReviewInboxItem>>('/content/inbox', { page });

  mine = (page = 1) => this.api.get<Page<ContentVersionRecord>>('/content/mine', { page });

  getVersion = (versionId: string) =>
    this.api.get<ContentVersionRecord>(`/content/versions/${versionId}`);

  approvalHistory = (versionId: string) =>
    this.api.get<Page<ApprovalRecord>>(`/content/versions/${versionId}/approvals`);

  submit = (versionId: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/submit`);

  openReview = (versionId: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/review`);

  /** Rejection always requires a reason — the server enforces this too
   * (`ReviewCommentSerializer.comment` is required, non-blank). */
  requestChanges = (versionId: string, comment: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/request-changes`, {
      comment,
    });

  approve = (versionId: string, comment = '') =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/approve`, { comment });

  schedule = (versionId: string, publishAt: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/schedule`, {
      publish_at: publishAt,
    });

  publish = (versionId: string) =>
    this.api.post<ContentVersionRecord>(`/content/versions/${versionId}/publish`);
}
