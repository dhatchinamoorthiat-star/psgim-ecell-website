import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QrService } from '../../core/services/qr.service';
import { toApiError } from '../core/api.service';
import {
  MyRegistration,
  OperationsApiService,
  REGISTRATION_STATUS_LABEL,
  formatWhen,
} from '../operations/operations-api.service';

interface StoredPass {
  token: string;
  code: string;
  issuedAt: string;
}

const STORE_PREFIX = 'ecell.pass.';

/**
 * The pass token is returned by the server exactly once (only its hash is
 * stored there), so this device keeps it locally, keyed by registration and
 * tied to the server's issue time. A pass replaced elsewhere invalidates the
 * local copy; "Replace pass" issues a new one and the old one stops working.
 */
function readStored(id: string): StoredPass | null {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + id);
    return raw ? (JSON.parse(raw) as StoredPass) : null;
  } catch {
    return null;
  }
}

function writeStored(id: string, value: StoredPass | null): void {
  try {
    if (value) localStorage.setItem(STORE_PREFIX + id, JSON.stringify(value));
    else localStorage.removeItem(STORE_PREFIX + id);
  } catch {
    /* storage disabled: the pass is still shown for this visit */
  }
}

/** /platform/my-events/:id — registration status, cancellation and the personal QR pass. */
@Component({
  selector: 'app-my-registration',
  standalone: true,
  imports: [RouterLink],
  template: `
    <p><a routerLink="/platform/my-events">← My events</a></p>
    @if (justRegistered()) {
      <div class="pf-alert pf-alert-ok" role="status">You're registered.</div>
    }
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">
        {{ error() }} <button class="pf-btn pf-btn-sm" type="button" (click)="load()">Retry</button>
      </div>
    }
    @if (notice()) {
      <div class="pf-alert pf-alert-ok" role="status">{{ notice() }}</div>
    }
    @if (loading()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else if (reg(); as r) {
      <div class="pf-card">
        <h1>{{ r.event.title }}</h1>
        <p class="pf-muted">
          {{ when(r.event.starts_at) }}
          @if (r.event.venue) {
            · {{ r.event.venue }}
          }
        </p>
        <p>
          Status:
          <span
            class="pf-chip"
            [class.pf-chip-ok]="r.status === 'confirmed'"
            [class.pf-chip-warn]="r.status !== 'confirmed'"
          >
            {{ label[r.status] }}
          </span>
          @if (r.checked_in) {
            <span class="pf-chip pf-chip-ok">Checked in</span>
          }
        </p>
        @if (r.status === 'event_cancelled') {
          <div class="pf-alert pf-alert-error">
            This event was cancelled{{ r.event.cancel_reason ? ': ' + r.event.cancel_reason : '' }}.
          </div>
        }
        @if (r.status === 'waitlisted') {
          <p class="pf-muted">
            You'll get a pass automatically if a place frees up — check back here.
          </p>
        }
      </div>

      @if (r.status === 'confirmed') {
        <section class="pf-card pass" aria-labelledby="pass-heading">
          <h2 id="pass-heading">Your pass</h2>
          @if (r.pass.state === 'revoked' && !stored()) {
            <div class="pf-alert pf-alert-error">
              Your previous pass was revoked ({{ r.pass.reason || 'replaced' }}).
            </div>
          }
          @if (stored(); as p) {
            <canvas
              #qr
              class="pass-qr"
              role="img"
              [attr.aria-label]="'QR pass for ' + r.event.title"
            ></canvas>
            <p class="pass-code">
              Manual code: <strong>{{ p.code }}</strong>
            </p>
            <p class="pf-muted">
              Show this at the entrance. Staff will check it against your college ID. Don't share it
              — a copy can be used only once and is tied to you.
            </p>
            <button
              class="pf-btn"
              type="button"
              [disabled]="busy()"
              (click)="confirmReplace.set(true)"
            >
              Replace pass
            </button>
          } @else if (r.pass.state === 'active') {
            <p>
              Your pass was opened on another device or this browser's storage was cleared. For your
              security we can't show it again — replace it to get a new one here (the old one stops
              working).
            </p>
            <button
              class="pf-btn pf-btn-primary"
              type="button"
              [disabled]="busy()"
              (click)="issue(true)"
            >
              Replace pass
            </button>
          } @else {
            <button
              class="pf-btn pf-btn-primary"
              type="button"
              [disabled]="busy()"
              (click)="issue(false)"
            >
              Show my pass
            </button>
          }
          @if (confirmReplace()) {
            <div class="pf-alert" role="alertdialog" aria-label="Confirm pass replacement">
              Replace your pass? The current QR and code stop working immediately.
              <button class="pf-btn pf-btn-sm pf-btn-danger" type="button" (click)="issue(true)">
                Replace
              </button>
              <button class="pf-btn pf-btn-sm" type="button" (click)="confirmReplace.set(false)">
                Keep current pass
              </button>
            </div>
          }
        </section>
      }

      @if (r.can_cancel) {
        <section class="pf-card">
          <h2>Can't attend?</h2>
          @if (!confirmCancel()) {
            <button class="pf-btn pf-btn-danger" type="button" (click)="confirmCancel.set(true)">
              Cancel registration
            </button>
          } @else {
            <p>
              Cancel your registration? Your pass stops working and your place may go to someone on
              the waitlist.
            </p>
            <button
              class="pf-btn pf-btn-danger"
              type="button"
              [disabled]="busy()"
              (click)="cancel()"
            >
              Yes, cancel
            </button>
            <button class="pf-btn" type="button" (click)="confirmCancel.set(false)">
              Keep my registration
            </button>
          }
        </section>
      }
    }
  `,
  styles: [
    `
      .pass {
        text-align: center;
      }
      .pass-qr {
        width: min(100%, 320px);
        height: auto;
        background: #fff;
        padding: 0.5rem;
        border-radius: 8px;
      }
      .pass-code {
        font-family: ui-monospace, monospace;
        font-size: 1.15rem;
        letter-spacing: 0.08em;
      }
      section.pf-card,
      div.pf-card {
        margin-top: 1rem;
      }
    `,
  ],
})
export class MyRegistrationComponent implements OnInit, OnDestroy {
  private api = inject(OperationsApiService);
  private qr = inject(QrService);
  private route = inject(ActivatedRoute);

  @ViewChild('qr') private canvas?: ElementRef<HTMLCanvasElement>;

  protected reg = signal<MyRegistration | null>(null);
  protected stored = signal<StoredPass | null>(null);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected confirmCancel = signal(false);
  protected confirmReplace = signal(false);
  protected justRegistered = signal(false);
  protected label = REGISTRATION_STATUS_LABEL;
  protected when = formatWhen;
  private id = '';
  private readonly passToDraw = computed(() => this.stored()?.token ?? null);

  constructor() {
    effect(() => {
      const token = this.passToDraw();
      if (token) queueMicrotask(() => this.draw(token));
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.justRegistered.set(this.route.snapshot.queryParamMap.has('registered'));
    void this.load();
  }

  ngOnDestroy(): void {
    this.qr.whenLogoReady(() => undefined);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const reg = await this.api.myRegistration(this.id);
      this.reg.set(reg);
      const local = readStored(this.id);
      // Keep the local pass only if it is the server's current active pass.
      if (
        local &&
        reg.status === 'confirmed' &&
        reg.pass.state === 'active' &&
        local.issuedAt === reg.pass.issued_at
      ) {
        this.stored.set(local);
      } else {
        if (local) writeStored(this.id, null);
        this.stored.set(null);
      }
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  async issue(replace: boolean): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.confirmReplace.set(false);
    try {
      const issued = await this.api.issuePass(this.id, replace);
      const value: StoredPass = {
        token: issued.token,
        code: issued.code,
        issuedAt: issued.registration.pass.issued_at ?? '',
      };
      writeStored(this.id, value);
      this.reg.set(issued.registration);
      this.stored.set(value);
      this.notice.set(replace ? 'New pass issued. The old one no longer works.' : null);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }

  async cancel(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.reg.set(await this.api.cancelMine(this.id));
      writeStored(this.id, null);
      this.stored.set(null);
      this.confirmCancel.set(false);
      this.notice.set('Your registration was cancelled.');
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }

  private draw(token: string): void {
    const canvas = this.canvas?.nativeElement;
    if (!canvas) return;
    this.qr.render(canvas, token, 640, true);
    this.qr.whenLogoReady(() => this.qr.render(canvas, token, 640, true));
  }
}
