import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import {
  OperationsApiService,
  Programme,
  RosterBatch,
  RosterRow,
  formatWhen,
} from '../operations/operations-api.service';

const ACTION_LABEL: Record<RosterRow['action'], string> = {
  create: 'New account',
  link: 'Add profile to existing account',
  update: 'Update',
  unchanged: 'No change',
  conflict: 'Conflict — not imported',
  error: 'Error — not imported',
};

/** Error code the invite endpoint returns after a part-way failure (see participants/views.py). */
export const INCOMPLETE_CODE = 'invitation_incomplete';
export const INCOMPLETE_NOTICE =
  'Invitations stopped part-way, so some may already have been sent. Automatic retry is unavailable. The status below shows what was recorded.';

export interface InviteOutcome {
  /** The run stopped before finishing, or stopped without recording any result. */
  incomplete: boolean;
  /** False when the run was claimed but no result was saved (e.g. the process was killed). */
  recorded: boolean;
  attempted: number | null;
  sent: number | null;
  failed: number | null;
  skipped: number | null;
  /** Accounts never reached. Derived from the created count, so only shown when that is known. */
  unprocessed: number | null;
}

/**
 * What the backend persisted about the invitation run, read only from the batch
 * payload so it survives a reload. Null when no run has been claimed.
 */
export function inviteOutcome(b: RosterBatch): InviteOutcome | null {
  if (!b.invited_at) return null;
  const inv = b.summary.invited;
  if (!inv) {
    return { incomplete: true, recorded: false, attempted: null, sent: null, failed: null, skipped: null, unprocessed: null };
  }
  const created = b.summary.applied?.created ?? null;
  const processed = inv.sent + inv.failed + inv.skipped;
  return {
    incomplete: inv.incomplete === true,
    recorded: true,
    attempted: inv.sent + inv.failed,
    sent: inv.sent,
    failed: inv.failed,
    skipped: inv.skipped,
    unprocessed: inv.incomplete === true && created !== null ? Math.max(created - processed, 0) : null,
  };
}

/**
 * /platform/admin/participants — programmes and roster import (B-1/B-2).
 * Upload → dry-run report (nothing written) → explicit "Apply" → separately,
 * explicit "Send invitations". No public sign-up exists.
 */
@Component({
  selector: 'app-participants-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Participants</h1>
        <p class="pf-muted">
          Import PSGIM students and approved external participants from an admin-prepared roster.
        </p>
      </div>
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="pf-alert pf-alert-ok" role="status">{{ notice() }}</div>
    }

    <section class="pf-card">
      <h2>Programmes</h2>
      <p class="pf-muted">
        Student rosters must use one of these codes or names in the programme column.
      </p>
      <ul>
        @for (p of programmes(); track p.id) {
          <li>
            {{ p.code }} — {{ p.name }} ({{ p.student_count }} students){{
              p.is_active ? '' : ' · inactive'
            }}
          </li>
        } @empty {
          <li class="pf-muted">No programmes yet.</li>
        }
      </ul>
      <form class="pf-form-row" (ngSubmit)="addProgramme()">
        <div class="pf-field">
          <label for="pg-code">Code</label>
          <input id="pg-code" class="pf-input" name="code" [(ngModel)]="pgCode" />
        </div>
        <div class="pf-field">
          <label for="pg-name">Name</label>
          <input id="pg-name" class="pf-input" name="name" [(ngModel)]="pgName" />
        </div>
        <button
          class="pf-btn"
          type="submit"
          [disabled]="busy() || !pgCode.trim() || !pgName.trim()"
        >
          Add programme
        </button>
      </form>
    </section>

    <section class="pf-card" style="margin-top: 1rem">
      <h2>Import a roster</h2>
      <p class="pf-muted">
        Students: <code>full_name, email, roll_number, programme, batch</code>. External
        participants: <code>full_name, email</code> and optional <code>institution</code>. CSV
        (UTF-8) or XLSX, up to 2 MB. Validating writes nothing and sends no email.
      </p>
      <form class="pf-form-row" (ngSubmit)="validate()">
        <div class="pf-field">
          <label for="rs-kind">Roster type</label>
          <select id="rs-kind" class="pf-select" name="kind" [(ngModel)]="kind">
            <option value="student">Students</option>
            <option value="external">External participants</option>
          </select>
        </div>
        <div class="pf-field">
          <label for="rs-file">File</label>
          <input
            id="rs-file"
            class="pf-input"
            type="file"
            accept=".csv,.xlsx"
            (change)="pick($event)"
          />
        </div>
        <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy() || !file">
          Validate (dry run)
        </button>
      </form>
    </section>

    @if (batch(); as b) {
      <section class="pf-card" style="margin-top: 1rem" aria-labelledby="rep-h">
        <h2 id="rep-h">
          {{ b.status === 'validated' ? 'Dry-run report' : 'Roster' }}: {{ b.filename }}
        </h2>
        <p>
          @for (k of summaryKeys; track k) {
            <span class="pf-chip" style="margin-right: 0.35rem"
              >{{ k }}: {{ b.summary[k] ?? 0 }}</span
            >
          }
        </p>
        @if (b.status === 'validated') {
          @if (writes() === 0) {
            <p class="pf-muted">Nothing in this file would be written.</p>
          } @else {
            <p>
              Applying writes <strong>{{ writes() }}</strong> row(s). Conflicts and errors are
              skipped. No email is sent.
            </p>
            <button
              class="pf-btn pf-btn-primary"
              type="button"
              [disabled]="busy()"
              (click)="apply()"
            >
              Apply {{ writes() }} row(s)
            </button>
          }
          <button class="pf-btn" type="button" [disabled]="busy()" (click)="discard()">
            Discard
          </button>
          <div class="rs-table">
            <table class="pf-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Result</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                @for (r of b.plan ?? []; track r.row) {
                  <tr [class.rs-bad]="r.action === 'conflict' || r.action === 'error'">
                    <td>{{ r.row }}</td>
                    <td>{{ actionLabel[r.action] }}</td>
                    <td>{{ r.data['full_name'] }}</td>
                    <td>{{ r.data['email'] }}</td>
                    <td>{{ r.messages.join(' ') }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (b.status === 'applied') {
          <p>
            Applied {{ when(b.applied_at) }}: {{ b.summary.applied?.created ?? 0 }} created,
            {{ b.summary.applied?.linked ?? 0 }} linked,
            {{ b.summary.applied?.updated ?? 0 }} updated.
          </p>
          @if (b.invited_at) {
            @let o = outcomeOf(b);
            @if (o?.incomplete) {
              <div class="pf-alert pf-alert-error rs-incomplete" role="alert" data-testid="invite-incomplete">
                <p><strong>Incomplete — action required.</strong></p>
                <p>
                  The invitation run for this roster stopped part-way ({{ when(b.invited_at) }}).
                  Some invitations may already have been sent. Automatic batch retry is unavailable,
                  and sending the batch again could email people twice.
                </p>
                @if (o.recorded) {
                  <p data-testid="invite-counts">
                    Attempted: {{ o.attempted }} · Sent: {{ o.sent }} · Failed: {{ o.failed }} ·
                    Already had a password: {{ o.skipped }} ·
                    Not processed: {{ o.unprocessed ?? 'unknown' }}
                  </p>
                } @else {
                  <p class="pf-muted">
                    No result was recorded for this run, so the counts are unknown.
                  </p>
                }
                <p>
                  Next step: do not resend this batch. Ask a person without a password to use
                  <a routerLink="/platform/forgot-password">Forgot password?</a> to set one.
                </p>
              </div>
            } @else {
              <p data-testid="invite-complete">
                Invitations sent {{ when(b.invited_at) }}: {{ o?.sent ?? 0 }} sent,
                {{ o?.failed ?? 0 }} failed.
                @if ((o?.failed ?? 0) > 0) {
                  Failed recipients can use <a routerLink="/platform/forgot-password">Forgot password?</a>.
                }
              </p>
            }
          } @else if ((b.summary.applied?.created ?? 0) > 0 && !inviteClaimed()) {
            <p class="pf-muted">
              New accounts have no password yet. Send invitations only when email delivery is set up
              and you are ready.
            </p>
            @if (!confirmInvite()) {
              <button class="pf-btn" type="button" (click)="confirmInvite.set(true)">
                Send invitations…
              </button>
            } @else {
              <p>
                Email {{ b.summary.applied?.created }} new account(s) a link to set their password?
              </p>
              <button
                class="pf-btn pf-btn-primary"
                type="button"
                [disabled]="busy()"
                (click)="invite()"
              >
                Yes, send invitations
              </button>
              <button class="pf-btn" type="button" (click)="confirmInvite.set(false)">
                Not now
              </button>
            }
          }
        }
      </section>
    }

    <section class="pf-card" style="margin-top: 1rem">
      <h2>Recent imports</h2>
      <ul>
        @for (h of history(); track h.id) {
          <li>
            <button class="pf-btn pf-btn-sm" type="button" (click)="open(h.id)">
              {{ h.filename }}
            </button>
            {{ h.kind }} · {{ h.status }} · {{ when(h.created_at) }} · {{ h.uploaded_by }}
            @if (outcomeOf(h)?.incomplete) {
              · <strong>Incomplete — action required</strong>
            }
          </li>
        } @empty {
          <li class="pf-muted">None yet.</li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .rs-table {
        overflow-x: auto;
        margin-top: 1rem;
      }
      .rs-bad td {
        color: #b03a2e;
      }
    `,
  ],
})
export class ParticipantsAdminComponent implements OnInit {
  private api = inject(OperationsApiService);
  protected programmes = signal<Programme[]>([]);
  protected history = signal<RosterBatch[]>([]);
  protected batch = signal<RosterBatch | null>(null);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected confirmInvite = signal(false);
  /** Set once an invitation run has been claimed in this session; the send action stays hidden. */
  protected inviteClaimed = signal(false);
  protected kind: 'student' | 'external' = 'student';
  protected file: File | null = null;
  protected pgCode = '';
  protected pgName = '';
  protected actionLabel = ACTION_LABEL;
  protected outcomeOf = inviteOutcome;
  protected when = formatWhen;
  protected summaryKeys = ['create', 'link', 'update', 'unchanged', 'conflict', 'error'];
  protected writes = computed(() => {
    const s = this.batch()?.summary;
    return s ? (s.create ?? 0) + (s.link ?? 0) + (s.update ?? 0) : 0;
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  pick(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  async addProgramme(): Promise<void> {
    await this.run(async () => {
      await this.api.createProgramme(this.pgCode.trim(), this.pgName.trim());
      this.pgCode = '';
      this.pgName = '';
      await this.refresh();
      return 'Programme added.';
    });
  }

  async validate(): Promise<void> {
    if (!this.file) return;
    await this.run(async () => {
      this.batch.set(await this.api.uploadRoster(this.kind, this.file!));
      await this.refresh();
      return 'Validated. Nothing has been written yet — review the report below.';
    });
  }

  async apply(): Promise<void> {
    const b = this.batch();
    if (!b || !confirm(`Apply ${this.writes()} row(s) from ${b.filename}? No email is sent.`))
      return;
    await this.run(async () => {
      this.batch.set(await this.api.applyRoster(b.id));
      await this.refresh();
      return 'Roster applied.';
    });
  }

  async discard(): Promise<void> {
    const b = this.batch();
    if (!b) return;
    await this.run(async () => {
      await this.api.discardRoster(b.id);
      this.batch.set(null);
      await this.refresh();
      return 'Dry run discarded.';
    });
  }

  async invite(): Promise<void> {
    const b = this.batch();
    if (!b) return;
    await this.run(async () => {
      try {
        this.batch.set(await this.api.inviteRoster(b.id));
      } catch (e) {
        // The server answers a part-way failure with `invitation_incomplete` after recording it.
        // Reload the persisted batch and show that, never the transient error text.
        const code = toApiError(e).code;
        const persisted = await this.api.rosterBatch(b.id).catch(() => null);
        if (persisted) this.batch.set(persisted);
        const incomplete =
          code === INCOMPLETE_CODE || (persisted !== null && inviteOutcome(persisted)?.incomplete === true);
        if (!incomplete) throw e;
        // The server has already claimed the batch. Hide the send action even if the reload failed.
        this.inviteClaimed.set(true);
        this.confirmInvite.set(false);
        await this.refresh();
        this.error.set(INCOMPLETE_NOTICE);
        return '';
      }
      this.confirmInvite.set(false);
      await this.refresh();
      return inviteOutcome(this.batch()!)?.incomplete
        ? ''
        : 'Invitations processed.';
    });
  }

  async open(id: string): Promise<void> {
    await this.run(async () => {
      this.inviteClaimed.set(false);
      this.batch.set(await this.api.rosterBatch(id));
      return '';
    });
  }

  private async refresh(): Promise<void> {
    try {
      const [p, h] = await Promise.all([this.api.programmes(), this.api.rosterBatches()]);
      this.programmes.set(p.results);
      this.history.set(h.results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    }
  }

  private async run(fn: () => Promise<string>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      this.notice.set((await fn()) || null);
    } catch (e) {
      const err = toApiError(e);
      this.error.set(err.fields['file']?.[0] ?? err.fields['kind']?.[0] ?? err.message);
    } finally {
      this.busy.set(false);
    }
  }
}
