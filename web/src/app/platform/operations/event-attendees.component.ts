import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import {
  Attendee,
  AttendanceSummary,
  OperationsApiService,
  formatWhen,
} from './operations-api.service';

type PendingAction = { kind: 'cancel' | 'manual' | 'void'; attendee: Attendee };

/** /platform/events/:slug/attendees — attendee list, attendance summary, staff actions, CSV export. */
@Component({
  selector: 'app-event-attendees',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <p>
      <a routerLink="/platform/operations">← Operations</a>
      · <a [routerLink]="['/platform/events', slug, 'scan']">Scan passes</a>
      @if (auth.canAnywhere('event.operations.manage')) {
        · <a [routerLink]="['/platform/events', slug, 'operations']">Settings</a>
      }
      @if (auth.canAnywhere('event_staff.assign')) {
        · <a [routerLink]="['/platform/events', slug, 'volunteers']">Volunteers</a>
      }
    </p>
    <div class="pf-page-head">
      <div>
        <h1>Attendees</h1>
        <p class="pf-muted">{{ title() }}</p>
      </div>
      @if (auth.canAnywhere('event.attendance.export')) {
        <div class="pf-toolbar">
          <button class="pf-btn" type="button" [disabled]="busy()" (click)="exportCsv(false)">
            Export CSV
          </button>
          <button class="pf-btn" type="button" [disabled]="busy()" (click)="exportCsv(true)">
            Export with emails
          </button>
        </div>
      }
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">
        {{ error() }} <button class="pf-btn pf-btn-sm" type="button" (click)="load()">Retry</button>
      </div>
    }
    @if (notice()) {
      <div class="pf-alert pf-alert-ok" role="status">{{ notice() }}</div>
    }
    @if (summary(); as s) {
      <div class="pf-grid at-stats" aria-label="Attendance summary">
        <div class="pf-card">
          <strong>{{ s.confirmed }}</strong
          ><span>confirmed{{ s.capacity ? ' / ' + s.capacity : '' }}</span>
        </div>
        <div class="pf-card">
          <strong>{{ s.checked_in }}</strong
          ><span>checked in</span>
        </div>
        <div class="pf-card">
          <strong>{{ s.waitlisted }}</strong
          ><span>waitlisted</span>
        </div>
        <div class="pf-card">
          <strong>{{ s.cancelled }}</strong
          ><span>cancelled</span>
        </div>
      </div>
    }

    @if (pending(); as p) {
      <div class="pf-card" role="dialog" aria-labelledby="pa-title" style="margin-top: 1rem">
        <h2 id="pa-title">{{ pendingTitle(p) }} — {{ p.attendee.name }}</h2>
        <div class="pf-field">
          <label for="pa-reason">Reason (required, recorded in the audit log)</label>
          <input id="pa-reason" class="pf-input" name="reason" [(ngModel)]="reason" />
        </div>
        <button
          class="pf-btn pf-btn-primary"
          type="button"
          [disabled]="busy() || !reason.trim()"
          (click)="confirmPending()"
        >
          Confirm
        </button>
        <button class="pf-btn" type="button" (click)="pending.set(null)">Back</button>
      </div>
    }

    @if (loading()) {
      <p class="pf-muted" role="status">Loading attendees…</p>
    } @else if (rows().length === 0 && !error()) {
      <div class="pf-card" style="margin-top: 1rem">
        <p class="pf-muted">No registrations yet.</p>
      </div>
    } @else if (rows().length) {
      <div class="pf-field" style="margin-top: 1rem">
        <label for="at-filter">Filter</label>
        <input
          id="at-filter"
          class="pf-input"
          [(ngModel)]="filterText"
          name="filter"
          placeholder="Name, roll number, institution"
        />
      </div>
      <div class="at-table-wrap">
        <table class="pf-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Roll / institution</th>
              <th>Status</th>
              <th>Checked in</th>
              <th><span class="pf-sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            @for (a of filtered(); track a.registration_id) {
              <tr>
                <td>{{ a.name }}</td>
                <td>{{ a.participant_type === 'student' ? 'Student' : 'External' }}</td>
                <td>
                  {{
                    a.participant_type === 'student'
                      ? a.roll_number + ' · ' + a.programme + ' · ' + a.batch
                      : a.institution
                  }}
                </td>
                <td>{{ a.status }}</td>
                <td>{{ a.checked_in_at ? when(a.checked_in_at) : '—' }}</td>
                <td class="at-actions">
                  @if (a.checkin_id && auth.canAnywhere('event.checkin')) {
                    <button class="pf-btn pf-btn-sm" type="button" (click)="ask('void', a)">
                      Reverse check-in
                    </button>
                  }
                  @if (
                    !a.checkin_id &&
                    a.status === 'confirmed' &&
                    auth.canAnywhere('event.operations.manage')
                  ) {
                    <button class="pf-btn pf-btn-sm" type="button" (click)="ask('manual', a)">
                      Manual check-in
                    </button>
                  }
                  @if (
                    !a.checkin_id &&
                    (a.status === 'confirmed' || a.status === 'waitlisted') &&
                    auth.canAnywhere('event.registration.manage')
                  ) {
                    <button
                      class="pf-btn pf-btn-sm pf-btn-danger"
                      type="button"
                      (click)="ask('cancel', a)"
                    >
                      Cancel
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [
    `
      .at-stats {
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        margin-top: 1rem;
      }
      .at-stats strong {
        display: block;
        font-size: 1.6rem;
      }
      .at-table-wrap {
        overflow-x: auto;
      }
      .at-actions {
        white-space: nowrap;
      }
    `,
  ],
})
export class EventAttendeesComponent implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(OperationsApiService);
  private route = inject(ActivatedRoute);

  protected slug = '';
  protected title = signal('');
  protected rows = signal<Attendee[]>([]);
  protected summary = signal<AttendanceSummary | null>(null);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected pending = signal<PendingAction | null>(null);
  protected reason = '';
  protected filterText = '';
  protected when = formatWhen;

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.attendees(this.slug);
      this.title.set(data.event.title);
      this.rows.set(data.results);
      this.summary.set(data.summary);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected filtered(): Attendee[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((a) =>
      [a.name, a.roll_number, a.institution, a.programme, a.batch].some((v) =>
        (v ?? '').toLowerCase().includes(q),
      ),
    );
  }

  protected pendingTitle(p: PendingAction): string {
    return { cancel: 'Cancel registration', manual: 'Manual check-in', void: 'Reverse check-in' }[
      p.kind
    ];
  }

  ask(kind: PendingAction['kind'], attendee: Attendee): void {
    this.reason = '';
    this.pending.set({ kind, attendee });
  }

  async confirmPending(): Promise<void> {
    const p = this.pending();
    if (!p) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (p.kind === 'cancel')
        await this.api.staffCancel(this.slug, p.attendee.registration_id, this.reason.trim());
      if (p.kind === 'manual')
        await this.api.manualCheckIn(this.slug, p.attendee.registration_id, this.reason.trim());
      if (p.kind === 'void' && p.attendee.checkin_id)
        await this.api.voidCheckIn(this.slug, p.attendee.checkin_id, this.reason.trim());
      this.notice.set(`${this.pendingTitle(p)} recorded for ${p.attendee.name}.`);
      this.pending.set(null);
      await this.load();
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }

  async exportCsv(includeEmail: boolean): Promise<void> {
    if (
      includeEmail &&
      !confirm(
        'Include participants’ email addresses? Only do this if you need to contact them; the export is logged.',
      )
    ) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const blob = await this.api.exportCsv(this.slug, includeEmail);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${this.slug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.notice.set('Export downloaded. It is recorded in the audit log.');
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }
}
