import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';
import { BlockRendererComponent } from '../../shared/blocks/block-renderer.component';
import { ContentVersionRecord } from '../editor/editor.types';
import { ApprovalsApiService } from './approvals-api.service';
import { ApprovalRecord, WORKFLOW_STATE_LABELS, WorkflowState } from './approvals.types';

/**
 * Phase 2D reviewer/author screen for exactly one submitted version:
 * "Open the exact submitted version in read-only preview... approve or
 * reject... require a reason for rejection... show who acted, when, and
 * at which stage... show actionable next steps to the content author."
 *
 * Renders the version through the same chrome-free `BlockRendererComponent`
 * the public site and the editor's own "Preview" mode use — with no
 * `editorHost`, so it is inherently read-only (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
 * "Editor/public separation"). This page never mutates `version.blocks`;
 * the only mutations it can trigger are workflow-state transitions
 * (open_review/approve/request-changes), each re-authorized server-side.
 */
@Component({
  selector: 'app-approval-review',
  standalone: true,
  imports: [DatePipe, RouterLink, BlockRendererComponent, ConfirmDialogComponent],
  providers: [ApprovalsApiService],
  template: `
    @if (loadError()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ loadError() }}</div>
    } @else if (!version()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else if (version(); as v) {
      <div class="pf-page-head">
        <div>
          <h1>{{ v.content_type }} / {{ v.slug }} — v{{ v.number }}</h1>
          <p class="pf-muted">
            By {{ v.author_email }} · last changed {{ v.updated_at | date: 'medium' }}
          </p>
        </div>
        <div class="be-toolbar-group">
          <span class="pf-chip" [class]="stateChipClass(v.state)">{{ stateLabel(v.state) }}</span>
          <a class="pf-btn pf-btn-sm" [routerLink]="['/platform/editor', v.content_type, v.slug]"
            >Open in editor</a
          >
        </div>
      </div>

      @if (actionError()) {
        <div class="pf-alert pf-alert-error" role="alert">{{ actionError() }}</div>
      }

      <section class="pf-card">
        <h2>Next steps</h2>
        <p>{{ nextSteps(v) }}</p>
        @if (canOpenReview()) {
          <button
            class="pf-btn pf-btn-primary pf-btn-sm"
            type="button"
            [disabled]="busy()"
            (click)="doOpenReview()"
          >
            Open review
          </button>
        }
        @if (canDecide()) {
          <div class="be-toolbar-group">
            <button
              class="pf-btn pf-btn-primary pf-btn-sm"
              type="button"
              [disabled]="busy()"
              (click)="approveDialog.open()"
            >
              Approve
            </button>
            <button
              class="pf-btn pf-btn-danger pf-btn-sm"
              type="button"
              [disabled]="busy()"
              (click)="rejectDialog.open()"
            >
              Reject
            </button>
          </div>
        }
      </section>

      <section class="pf-card">
        <h2>Submitted content (read-only)</h2>
        <div class="be-canvas-frame" style="width: 100%">
          <block-renderer [blocks]="v.blocks.blocks" />
        </div>
      </section>

      <section class="pf-card">
        <h2>Approval history</h2>
        @if (history().length === 0) {
          <p class="pf-muted">No decisions recorded yet.</p>
        } @else {
          <table class="pf-table">
            <caption class="pf-sr-only">
              Approval history
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Decision</th>
                <th scope="col">By</th>
                <th scope="col">When</th>
                <th scope="col">Comment</th>
              </tr>
            </thead>
            <tbody>
              @for (h of history(); track h.id) {
                <tr>
                  <td data-label="Stage">{{ h.stage_index + 1 }} · {{ h.stage_kind }}</td>
                  <td data-label="Decision">
                    <span
                      class="pf-chip"
                      [class.pf-chip-ok]="h.decision === 'approved'"
                      [class.pf-chip-warn]="h.decision === 'changes_requested'"
                    >
                      {{ h.decision === 'approved' ? 'Approved' : 'Changes requested' }}
                    </span>
                  </td>
                  <td data-label="By">{{ h.approver_email }}</td>
                  <td data-label="When">{{ h.created_at | date: 'medium' }}</td>
                  <td data-label="Comment">{{ h.comment || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }

    <app-confirm-dialog
      #approveDialog
      title="Approve this version?"
      message="This records your approval for the current stage. It cannot be undone."
      confirmLabel="Approve"
      [danger]="false"
      (confirmed)="doApprove()"
    />
    <app-confirm-dialog
      #rejectDialog
      title="Request changes?"
      message="The author will see this and can revise and resubmit."
      confirmLabel="Request changes"
      [withReason]="true"
      (confirmed)="doReject($event)"
    />
  `,
})
export class ApprovalReviewComponent implements OnInit {
  @Input({ required: true }) versionId!: string;

  private api = inject(ApprovalsApiService);
  private auth = inject(AuthService);
  private approveDialog = viewChild.required<ConfirmDialogComponent>('approveDialog');
  private rejectDialog = viewChild.required<ConfirmDialogComponent>('rejectDialog');

  version = signal<ContentVersionRecord | null>(null);
  history = signal<ApprovalRecord[]>([]);
  loadError = signal<string | null>(null);
  actionError = signal<string | null>(null);
  busy = signal(false);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const [version, historyPage] = await Promise.all([
        this.api.getVersion(this.versionId),
        this.api.approvalHistory(this.versionId),
      ]);
      this.version.set(version);
      this.history.set(historyPage.results);
    } catch (e) {
      const err = toApiError(e);
      this.loadError.set(
        err.status === 404
          ? 'This version could not be found, or you do not have access to it.'
          : 'Could not load this version. Please try again.',
      );
    }
  }

  /** UX-only gate — the server re-checks `content.review` on the actual POST. Never
   * hides the section for authorization reasons alone; the author is excluded here
   * only because the workflow itself refuses self-review/self-approval. */
  canOpenReview(): boolean {
    const v = this.version();
    return !!v && v.state === 'SUBMITTED' && v.author_email !== this.auth.user()?.email;
  }

  canDecide(): boolean {
    const v = this.version();
    return !!v && v.state === 'IN_REVIEW' && v.author_email !== this.auth.user()?.email;
  }

  stateLabel(state: string): string {
    return WORKFLOW_STATE_LABELS[state as WorkflowState] ?? state;
  }

  stateChipClass(state: string): string {
    if (state === 'PUBLISHED' || state === 'APPROVED') return 'pf-chip-ok';
    if (state === 'CHANGES_REQUESTED' || state === 'ARCHIVED') return 'pf-chip-warn';
    return 'pf-chip-accent';
  }

  nextSteps(v: ContentVersionRecord): string {
    switch (v.state as WorkflowState) {
      case 'DRAFT':
        return 'This is a draft. Open it in the editor and submit it for review when ready.';
      case 'SUBMITTED':
        return this.canOpenReview()
          ? 'This submission is waiting for a reviewer to open it.'
          : 'Waiting for an authorized reviewer to open this submission.';
      case 'IN_REVIEW':
        return this.canDecide()
          ? 'This is awaiting your decision for the current approval stage.'
          : 'Awaiting approval from the next required reviewer.';
      case 'CHANGES_REQUESTED':
        return 'Changes were requested. The author can revise and resubmit this content.';
      case 'APPROVED':
        return 'All required approvals are satisfied. This version can now be scheduled or published.';
      case 'SCHEDULED':
        return 'This version is scheduled to publish automatically.';
      case 'PUBLISHED':
        return 'This version is live.';
      case 'ARCHIVED':
        return 'This version has been unpublished/archived.';
      default:
        return '';
    }
  }

  async doOpenReview(): Promise<void> {
    await this.runAction(() => this.api.openReview(this.versionId));
  }

  async doApprove(): Promise<void> {
    await this.runAction(() => this.api.approve(this.versionId));
  }

  async doReject(result: { reason: string }): Promise<void> {
    if (!result.reason.trim()) {
      this.actionError.set('A reason is required to request changes.');
      return;
    }
    await this.runAction(() => this.api.requestChanges(this.versionId, result.reason.trim()));
  }

  private async runAction(action: () => Promise<ContentVersionRecord>): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await action();
      this.version.set(updated);
      const historyPage = await this.api.approvalHistory(this.versionId);
      this.history.set(historyPage.results);
    } catch (e) {
      const err = toApiError(e);
      this.actionError.set(err.message || 'That action could not be completed.');
    } finally {
      this.busy.set(false);
    }
  }
}
