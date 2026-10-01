import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { Page } from '../core/api.types';
import { ContentVersionRecord } from '../editor/editor.types';
import { ApprovalsApiService } from './approvals-api.service';
import { ReviewInboxItem, WORKFLOW_STATE_LABELS, WorkflowState } from './approvals.types';

type Tab = 'pending' | 'mine';

const MINE_STATUSES: WorkflowState[] = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

/**
 * Phase 2D approval inbox (task §4): "Pending My Review" and "Submitted by
 * Me", each server-scoped (`/content/inbox`, `/content/mine`) — this
 * component only adds client-side filtering on top of what the server
 * already returned, never a second authorization decision. Content-type
 * and status filters narrow within that authorized set; they cannot widen
 * it (no vertical/author id is ever sent to the server from here).
 */
@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  providers: [ApprovalsApiService],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Approvals</h1>
        <p class="pf-muted">Review queue and your own submissions.</p>
      </div>
    </div>

    <div class="be-toolbar-group" role="tablist" aria-label="Approvals views">
      <button
        type="button"
        role="tab"
        class="pf-btn pf-btn-sm"
        [class.pf-btn-primary]="tab() === 'pending'"
        [attr.aria-selected]="tab() === 'pending'"
        (click)="setTab('pending')"
      >
        Pending my review
      </button>
      <button
        type="button"
        role="tab"
        class="pf-btn pf-btn-sm"
        [class.pf-btn-primary]="tab() === 'mine'"
        [attr.aria-selected]="tab() === 'mine'"
        (click)="setTab('mine')"
      >
        Submitted by me
      </button>
    </div>

    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }

    <div class="pf-toolbar" role="search">
      <label class="pf-sr-only" for="ai-content-type">Content type</label>
      <select
        id="ai-content-type"
        class="pf-select"
        style="max-width: 12rem"
        [(ngModel)]="contentTypeFilter"
        (ngModelChange)="applyFilters()"
      >
        <option value="">All content types</option>
        @for (ct of contentTypes(); track ct) {
          <option [value]="ct">{{ ct }}</option>
        }
      </select>
      @if (tab() === 'mine') {
        <label class="pf-sr-only" for="ai-status">Status</label>
        <select
          id="ai-status"
          class="pf-select"
          style="max-width: 14rem"
          [(ngModel)]="statusFilter"
          (ngModelChange)="applyFilters()"
        >
          <option value="">All statuses</option>
          @for (s of allStatuses; track s) {
            <option [value]="s">{{ stateLabel(s) }}</option>
          }
        </select>
      }
    </div>

    @if (tab() === 'pending') {
      @if (filteredPending().length === 0) {
        <p class="pf-muted">Nothing is waiting on you right now.</p>
      } @else {
        <table class="pf-table">
          <caption class="pf-sr-only">
            Pending my review
          </caption>
          <thead>
            <tr>
              <th scope="col">Content</th>
              <th scope="col">Version</th>
              <th scope="col">State</th>
              <th scope="col">Author</th>
              <th scope="col">Submitted/changed</th>
              <th scope="col"><span class="pf-sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            @for (item of filteredPending(); track item.id) {
              <tr>
                <td data-label="Content">{{ item.content_type }} / {{ item.slug }}</td>
                <td data-label="Version">v{{ item.number }}</td>
                <td data-label="State">
                  <span class="pf-chip pf-chip-accent">{{ stateLabel(item.state) }}</span>
                </td>
                <td data-label="Author">{{ item.author_email }}</td>
                <td data-label="Changed">{{ item.updated_at | date: 'medium' }}</td>
                <td class="pf-actions">
                  <a class="pf-btn pf-btn-sm pf-btn-primary" [routerLink]="['/platform/approvals', item.id]">
                    {{ item.pending_action === 'open_review' ? 'Open review' : 'Review' }}
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    } @else {
      @if (filteredMine().length === 0) {
        <p class="pf-muted">You haven't submitted anything matching this filter yet.</p>
      } @else {
        <table class="pf-table">
          <caption class="pf-sr-only">
            Submitted by me
          </caption>
          <thead>
            <tr>
              <th scope="col">Content</th>
              <th scope="col">Version</th>
              <th scope="col">State</th>
              <th scope="col">Last changed</th>
              <th scope="col"><span class="pf-sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            @for (item of filteredMine(); track item.id) {
              <tr>
                <td data-label="Content">{{ item.content_type }} / {{ item.slug }}</td>
                <td data-label="Version">v{{ item.number }}</td>
                <td data-label="State">
                  <span
                    class="pf-chip"
                    [class.pf-chip-ok]="item.state === 'PUBLISHED' || item.state === 'APPROVED'"
                    [class.pf-chip-warn]="item.state === 'CHANGES_REQUESTED'"
                    [class.pf-chip-accent]="
                      item.state !== 'PUBLISHED' &&
                      item.state !== 'APPROVED' &&
                      item.state !== 'CHANGES_REQUESTED'
                    "
                  >
                    {{ stateLabel(item.state) }}
                  </span>
                </td>
                <td data-label="Changed">{{ item.updated_at | date: 'medium' }}</td>
                <td class="pf-actions">
                  <a class="pf-btn pf-btn-sm" [routerLink]="['/platform/approvals', item.id]">View</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    }
  `,
})
export class ApprovalInboxComponent implements OnInit {
  private api = inject(ApprovalsApiService);

  protected tab = signal<Tab>('pending');
  protected pending = signal<ReviewInboxItem[]>([]);
  protected mine = signal<ContentVersionRecord[]>([]);
  protected error = signal<string | null>(null);
  protected contentTypeFilter = '';
  protected statusFilter = '';
  readonly allStatuses = MINE_STATUSES;

  protected filteredPending = signal<ReviewInboxItem[]>([]);
  protected filteredMine = signal<ContentVersionRecord[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.applyFilters();
  }

  contentTypes(): string[] {
    const source = this.tab() === 'pending' ? this.pending() : this.mine();
    return [...new Set(source.map((i) => i.content_type))].sort();
  }

  stateLabel(state: string): string {
    return WORKFLOW_STATE_LABELS[state as WorkflowState] ?? state;
  }

  applyFilters(): void {
    this.filteredPending.set(
      this.pending().filter((i) => !this.contentTypeFilter || i.content_type === this.contentTypeFilter),
    );
    this.filteredMine.set(
      this.mine().filter(
        (i) =>
          (!this.contentTypeFilter || i.content_type === this.contentTypeFilter) &&
          (!this.statusFilter || i.state === this.statusFilter),
      ),
    );
  }

  private async loadAll(): Promise<void> {
    try {
      const [pendingPage, minePage] = await this.loadAllPages();
      this.pending.set(pendingPage);
      this.mine.set(minePage);
      this.applyFilters();
    } catch (e) {
      this.error.set(toApiError(e).message || 'Could not load approvals.');
    }
  }

  private async loadAllPages(): Promise<[ReviewInboxItem[], ContentVersionRecord[]]> {
    const pending = await this.collect((page) => this.api.inbox(page));
    const mine = await this.collect((page) => this.api.mine(page));
    return [pending, mine];
  }

  private async collect<T>(fetchPage: (page: number) => Promise<Page<T>>): Promise<T[]> {
    const out: T[] = [];
    let page = 1;
    // Bounded loop: approval queues/submission histories are small in practice
    // (a governance workflow, not a public feed); this caps pathological cases
    // at 20 pages instead of looping forever on server misbehavior.
    for (let i = 0; i < 20; i++) {
      const result = await fetchPage(page);
      out.push(...result.results);
      if (!result.next) break;
      page += 1;
    }
    return out;
  }
}
