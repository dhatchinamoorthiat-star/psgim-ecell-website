import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../core/api.service';
import {
  ExternalSummary,
  Operations,
  OperationsApiService,
  Programme,
  REGISTRATION_STATE_LABEL,
} from './operations-api.service';

function toLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fromLocal = (v: string): string | null => (v ? new Date(v).toISOString() : null);

/** /platform/events/:slug/operations — registration window, capacity, eligibility, check-in, cancellation. */
@Component({
  selector: 'app-event-operations',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <p>
      <a [routerLink]="['/platform/events', slug]">← Event</a> ·
      <a [routerLink]="['/platform/events', slug, 'attendees']">Attendees</a>
    </p>
    <div class="pf-page-head">
      <div>
        <h1>Registration & check-in</h1>
        @if (ops(); as o) {
          <p class="pf-muted">
            {{ o.title }} · <span class="pf-chip">{{ stateLabel[o.registration_state] }}</span>
          </p>
        }
      </div>
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="pf-alert pf-alert-ok" role="status">{{ notice() }}</div>
    }
    @if (loading()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else if (ops(); as o) {
      @if (o.status === 'cancelled') {
        <div class="pf-alert pf-alert-error">This event was cancelled: {{ o.cancel_reason }}</div>
      }
      @if (!o.is_published) {
        <div class="pf-alert">
          This event isn't published yet. Registration opens only once it is published.
        </div>
      }
      <form class="pf-card" (ngSubmit)="save()" novalidate>
        <fieldset [disabled]="o.status === 'cancelled'">
          <h2>Registration</h2>
          <div class="pf-form-row">
            <div class="pf-field">
              <label for="op-open">Opens</label>
              <input
                id="op-open"
                type="datetime-local"
                class="pf-input"
                name="open"
                [(ngModel)]="f.registration_opens_at"
              />
            </div>
            <div class="pf-field">
              <label for="op-close">Closes</label>
              <input
                id="op-close"
                type="datetime-local"
                class="pf-input"
                name="close"
                [(ngModel)]="f.registration_closes_at"
              />
              @if (fieldError('registration_closes_at')) {
                <small class="pf-field-error">{{ fieldError('registration_closes_at') }}</small>
              }
            </div>
          </div>
          <div class="pf-form-row">
            <div class="pf-field">
              <label for="op-cap">Capacity</label>
              <input
                id="op-cap"
                type="number"
                min="1"
                class="pf-input"
                name="capacity"
                [(ngModel)]="f.capacity"
                placeholder="Unlimited"
              />
              <small>Leave empty for no limit.</small>
              @if (fieldError('capacity')) {
                <small class="pf-field-error">{{ fieldError('capacity') }}</small>
              }
            </div>
            <label class="pf-check"
              ><input type="checkbox" name="waitlist" [(ngModel)]="f.waitlist_enabled" /> Waitlist
              when full (first come, first promoted)</label
            >
          </div>

          <h2>Who can register</h2>
          <label class="pf-check"
            ><input type="checkbox" name="students" [(ngModel)]="f.allow_students" /> PSGIM
            students</label
          >
          @if (f.allow_students) {
            <div class="pf-field">
              <span id="op-prog-label">Limit to programmes (none selected = all)</span>
              <div role="group" aria-labelledby="op-prog-label" class="op-checks">
                @for (p of programmes(); track p.id) {
                  <label class="pf-check">
                    <input
                      type="checkbox"
                      [checked]="f.student_programmes.includes(p.id)"
                      (change)="toggleProgramme(p.id)"
                    />
                    {{ p.name }}
                  </label>
                }
                @if (programmes().length === 0) {
                  <small class="pf-muted">No programmes defined yet.</small>
                }
              </div>
            </div>
            <div class="pf-field">
              <label for="op-batches"
                >Limit to batches (comma-separated, exactly as on the roster; empty = all)</label
              >
              <input
                id="op-batches"
                class="pf-input"
                name="batches"
                [(ngModel)]="f.batches"
                placeholder="e.g. 2025-27"
              />
            </div>
          }
          <label class="pf-check"
            ><input type="checkbox" name="external" [(ngModel)]="f.allow_external" /> Approved
            external participants</label
          >
          @if (f.allow_external) {
            <div class="pf-field">
              <label class="pf-check"
                ><input type="radio" name="mode" value="all" [(ngModel)]="f.external_mode" /> All
                external participants</label
              >
              <label class="pf-check"
                ><input type="radio" name="mode" value="allowlist" [(ngModel)]="f.external_mode" />
                Only those I list</label
              >
            </div>
            @if (f.external_mode === 'allowlist') {
              <div class="pf-field">
                <label for="op-ext">Add external participant</label>
                <input
                  id="op-ext"
                  class="pf-input"
                  name="extq"
                  [(ngModel)]="extQuery"
                  (input)="searchExternals()"
                  placeholder="Name, email or institution"
                />
                @for (e of extResults(); track e.id) {
                  <button type="button" class="pf-btn pf-btn-sm" (click)="addExternal(e)">
                    + {{ e.name }} ({{ e.institution || e.email }})
                  </button>
                }
                <ul>
                  @for (e of f.external_allowlist; track e.id) {
                    <li>
                      {{ e.name }} — {{ e.email }}
                      <button type="button" class="pf-btn pf-btn-sm" (click)="removeExternal(e.id)">
                        Remove
                      </button>
                    </li>
                  }
                </ul>
              </div>
            }
          }

          <h2>Check-in</h2>
          <div class="pf-form-row">
            <div class="pf-field">
              <label for="op-cin">Check-in opens</label>
              <input
                id="op-cin"
                type="datetime-local"
                class="pf-input"
                name="cin"
                [(ngModel)]="f.checkin_opens_at"
              />
            </div>
            <div class="pf-field">
              <label for="op-cout">Check-in closes</label>
              <input
                id="op-cout"
                type="datetime-local"
                class="pf-input"
                name="cout"
                [(ngModel)]="f.checkin_closes_at"
              />
              @if (fieldError('checkin_closes_at')) {
                <small class="pf-field-error">{{ fieldError('checkin_closes_at') }}</small>
              }
            </div>
          </div>
          <div class="pf-toolbar">
            <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()">Save</button>
          </div>
        </fieldset>
      </form>

      @if (o.status !== 'cancelled') {
        <section class="pf-card" style="margin-top: 1rem">
          <h2>Cancel this event</h2>
          <p class="pf-muted">
            All registrations are marked cancelled and passes stop working. This can't be undone.
          </p>
          <div class="pf-field">
            <label for="op-reason">Reason (shown to registrants)</label>
            <input id="op-reason" class="pf-input" name="reason" [(ngModel)]="cancelReason" />
          </div>
          <button
            class="pf-btn pf-btn-danger"
            type="button"
            [disabled]="busy() || !cancelReason.trim()"
            (click)="cancelEvent()"
          >
            Cancel event
          </button>
        </section>
      }
    }
  `,
  styles: [
    `
      fieldset {
        border: 0;
        padding: 0;
        margin: 0;
      }
      h2 {
        margin-top: 1.25rem;
      }
      .op-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 1rem;
      }
    `,
  ],
})
export class EventOperationsComponent implements OnInit {
  private api = inject(OperationsApiService);
  private route = inject(ActivatedRoute);

  protected slug = '';
  protected ops = signal<Operations | null>(null);
  protected programmes = signal<Pick<Programme, 'id' | 'code' | 'name'>[]>([]);
  protected extResults = signal<ExternalSummary[]>([]);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected fields = signal<Record<string, string[]>>({});
  protected stateLabel = REGISTRATION_STATE_LABEL;
  protected cancelReason = '';
  protected extQuery = '';
  protected f = {
    registration_opens_at: '',
    registration_closes_at: '',
    capacity: null as number | null,
    waitlist_enabled: false,
    checkin_opens_at: '',
    checkin_closes_at: '',
    allow_students: false,
    student_programmes: [] as string[],
    batches: '',
    allow_external: false,
    external_mode: 'all' as 'all' | 'allowlist',
    external_allowlist: [] as ExternalSummary[],
  };

  async ngOnInit(): Promise<void> {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    try {
      const [ops, programmes] = await Promise.all([
        this.api.operations(this.slug),
        this.api.operationsProgrammes(),
      ]);
      this.apply(ops);
      this.programmes.set(programmes.results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected fieldError(key: string): string | null {
    return this.fields()[key]?.[0] ?? null;
  }

  toggleProgramme(id: string): void {
    const set = new Set(this.f.student_programmes);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.f.student_programmes = [...set];
  }

  private searchTimer?: ReturnType<typeof setTimeout>;
  searchExternals(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(async () => {
      if (this.extQuery.trim().length < 2) return this.extResults.set([]);
      try {
        this.extResults.set((await this.api.externals(this.extQuery.trim())).results);
      } catch {
        this.extResults.set([]);
      }
    }, 250);
  }

  addExternal(e: ExternalSummary): void {
    if (!this.f.external_allowlist.some((x) => x.id === e.id))
      this.f.external_allowlist = [...this.f.external_allowlist, e];
  }

  removeExternal(id: string): void {
    this.f.external_allowlist = this.f.external_allowlist.filter((x) => x.id !== id);
  }

  async save(): Promise<void> {
    await this.run(async () => {
      const capacity =
        this.f.capacity === null || (this.f.capacity as unknown) === ''
          ? null
          : Number(this.f.capacity);
      this.apply(
        await this.api.updateOperations(this.slug, {
          registration_opens_at: fromLocal(this.f.registration_opens_at),
          registration_closes_at: fromLocal(this.f.registration_closes_at),
          capacity,
          waitlist_enabled: this.f.waitlist_enabled,
          checkin_opens_at: fromLocal(this.f.checkin_opens_at),
          checkin_closes_at: fromLocal(this.f.checkin_closes_at),
          allow_students: this.f.allow_students,
          student_programmes: this.f.student_programmes,
          student_batches: this.f.batches
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean),
          allow_external: this.f.allow_external,
          external_mode: this.f.external_mode,
          external_allowlist: this.f.external_allowlist.map((e) => e.id),
        }),
      );
      return 'Saved.';
    });
  }

  async cancelEvent(): Promise<void> {
    if (!confirm('Cancel this event for everyone? This cannot be undone.')) return;
    await this.run(async () => {
      this.apply(await this.api.cancelEvent(this.slug, this.cancelReason.trim()));
      return 'Event cancelled. Registrants see the reason on their My events page.';
    });
  }

  private async run(fn: () => Promise<string>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.fields.set({});
    try {
      this.notice.set(await fn());
    } catch (e) {
      const err: ApiError = toApiError(e);
      this.fields.set(err.fields);
      this.error.set(err.message);
    } finally {
      this.busy.set(false);
    }
  }

  private apply(o: Operations): void {
    this.ops.set(o);
    this.f = {
      registration_opens_at: toLocal(o.registration_opens_at),
      registration_closes_at: toLocal(o.registration_closes_at),
      capacity: o.capacity,
      waitlist_enabled: o.waitlist_enabled,
      checkin_opens_at: toLocal(o.checkin_opens_at),
      checkin_closes_at: toLocal(o.checkin_closes_at),
      allow_students: o.allow_students,
      student_programmes: [...o.student_programmes],
      batches: o.student_batches.join(', '),
      allow_external: o.allow_external,
      external_mode: o.external_mode,
      external_allowlist: [...o.external_allowlist],
    };
  }
}
