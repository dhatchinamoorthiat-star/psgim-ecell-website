import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError, toApiError } from '../core/api.service';
import {
  OperationsApiService,
  ScanResult,
  ScannerInfo,
  formatWhen,
  newIdempotencyKey,
} from './operations-api.service';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Whether this user may scan for *this* event. Route guards only know "can
 * check in somewhere"; the server decides per event, so nothing below the
 * header renders until it has answered.
 */
type Access = 'loading' | 'ready' | 'denied' | 'failed';

/** 403 and 404 look the same, so the page never reveals whether an event exists. */
const isDenied = (e: unknown) => e instanceof ApiError && (e.status === 403 || e.status === 404);

const OUTCOME: Record<ScanResult['outcome'], { title: string; tone: 'ok' | 'warn' | 'error' }> = {
  checked_in: { title: 'Checked in', tone: 'ok' },
  already_checked_in: { title: 'Already checked in', tone: 'warn' },
  invalid: { title: 'Not a valid pass', tone: 'error' },
  revoked: { title: 'This pass was replaced or revoked', tone: 'error' },
  wrong_event: { title: 'This pass is for a different event', tone: 'error' },
  event_cancelled: { title: 'This event is cancelled', tone: 'error' },
  not_confirmed: { title: 'Registration is not confirmed', tone: 'error' },
  outside_window: { title: 'Check-in is not open right now', tone: 'error' },
};

/**
 * /platform/events/:slug/scan — staff scanner. Uses the browser's built-in
 * BarcodeDetector where available (Chromium/Android); everywhere else, and as
 * a fallback, staff type the participant's pass code. No third-party decoder
 * (decision B-4). Every result is validated by the server.
 */
@Component({
  selector: 'app-event-scanner',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <p><a [routerLink]="['/platform/events', slug, 'attendees']">← Attendees</a></p>
    <div class="pf-page-head">
      <div>
        <h1>Scan passes</h1>
        @if (access() === 'ready' && info(); as i) {
          <p class="pf-muted">
            {{ i.title }} · {{ i.summary.checked_in }} checked in of {{ i.summary.confirmed }}
          </p>
        }
      </div>
    </div>
    @if (access() === 'loading') {
      <p class="pf-muted" role="status">Checking your access to this event…</p>
    } @else if (access() === 'denied') {
      <div class="pf-card" role="alert">
        <h2>Scanner not available</h2>
        <p class="pf-muted">
          You don't have check-in access for this event, or it isn't available. If you were
          appointed as a volunteer, ask the organiser to check your assignment.
        </p>
        <a class="pf-btn" routerLink="/platform/operations">Back to my events</a>
      </div>
    } @else if (access() === 'failed') {
      <div class="pf-alert pf-alert-error" role="alert">
        {{ error() }}
        <button class="pf-btn pf-btn-sm" type="button" (click)="loadAccess()">Retry</button>
      </div>
    } @else {
      @if (error()) {
        <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
      }
      @if (info(); as i) {
        @if (!i.checkin_open) {
          <div class="pf-alert" role="status">
            Check-in is not open now
            @if (i.checkin_opens_at) {
              ({{ when(i.checkin_opens_at) }} – {{ when(i.checkin_closes_at) }})
            }
            . Scans will be refused until it opens.
          </div>
        }
      }

      <div class="sc-layout">
        <section class="pf-card" aria-labelledby="cam-h">
          <h2 id="cam-h">Camera</h2>
          @if (!detectorAvailable) {
            <p class="pf-muted">
              This browser can't read QR codes from the camera. Use the pass code below (printed
              under the participant's QR).
            </p>
          } @else if (!cameraOn()) {
            <button class="pf-btn pf-btn-primary" type="button" (click)="startCamera()">
              Start camera
            </button>
          }
          <video
            #video
            class="sc-video"
            [hidden]="!cameraOn()"
            playsinline
            muted
            aria-label="Camera preview"
          ></video>
          @if (cameraOn()) {
            <button class="pf-btn" type="button" (click)="stopCamera()">Stop camera</button>
          }
        </section>

        <section class="pf-card" aria-labelledby="code-h">
          <h2 id="code-h">Pass code</h2>
          <form (ngSubmit)="submitCode()">
            <div class="pf-field">
              <label for="sc-code">Code (e.g. K7QF2-MXP9A)</label>
              <input
                id="sc-code"
                class="pf-input sc-code"
                name="code"
                [(ngModel)]="code"
                autocomplete="off"
                autocapitalize="characters"
              />
            </div>
            <button
              class="pf-btn pf-btn-primary"
              type="submit"
              [disabled]="busy() || code.trim().length < 6"
            >
              Check in
            </button>
          </form>
        </section>
      </div>

      <div aria-live="assertive">
        @if (result(); as r) {
          <section
            class="pf-card sc-result"
            [class.ok]="tone(r) === 'ok'"
            [class.warn]="tone(r) === 'warn'"
            [class.err]="tone(r) === 'error'"
          >
            <h2>{{ title(r) }}</h2>
            @if (r.participant; as p) {
              <p class="sc-name">{{ p.name }}</p>
              <p>
                {{
                  p.participant_type === 'student'
                    ? 'Student · ' + p.roll_number + ' · ' + p.programme + ' · ' + p.batch
                    : 'External · ' + (p.institution || '—')
                }}
              </p>
              <p class="pf-muted">Compare with their college or photo ID.</p>
            }
            @if (r.outcome === 'already_checked_in') {
              <p>First checked in {{ when(r.checked_in_at) }} by {{ r.checked_in_by }}.</p>
            }
            @if (r.outcome === 'not_confirmed' && r.status) {
              <p>Registration status: {{ r.status }}.</p>
            }
            <button class="pf-btn" type="button" (click)="next()">Scan next</button>
          </section>
        }
      </div>
    }
  `,
  styles: [
    `
      .sc-layout {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        margin-top: 1rem;
      }
      .sc-video {
        width: 100%;
        max-height: 60vh;
        border-radius: 8px;
        background: #000;
      }
      .sc-code {
        font-family: ui-monospace, monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .sc-result {
        margin-top: 1rem;
        border-left: 6px solid var(--pf-border, #888);
      }
      .sc-result.ok {
        border-left-color: #1f8f4e;
      }
      .sc-result.warn {
        border-left-color: #b7791f;
      }
      .sc-result.err {
        border-left-color: #c0392b;
      }
      .sc-name {
        font-size: 1.4rem;
        font-weight: 700;
      }
    `,
  ],
})
export class EventScannerComponent implements OnInit, OnDestroy {
  private api = inject(OperationsApiService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;

  protected slug = '';
  protected access = signal<Access>('loading');
  protected info = signal<ScannerInfo | null>(null);
  protected result = signal<ScanResult | null>(null);
  protected cameraOn = signal(false);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected code = '';
  protected when = formatWhen;
  protected readonly detectorAvailable =
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    !!navigator.mediaDevices?.getUserMedia;

  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorLike | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private lastValue = '';
  private lastAt = 0;
  private autostart = false;

  ngOnInit(): void {
    this.autostart = this.route.snapshot?.queryParamMap?.get('start') === '1';
    // The component is reused when only :slug changes, so reset on every change:
    // nothing from the previous event (counts, last result, typed code, camera) survives.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.stopCamera();
      this.slug = params.get('slug') ?? '';
      this.info.set(null);
      this.result.set(null);
      this.error.set(null);
      this.code = '';
      this.lastValue = '';
      void this.loadAccess();
    });
  }

  async loadAccess(): Promise<void> {
    const slug = this.slug;
    this.access.set('loading');
    this.error.set(null);
    try {
      const info = await this.api.scanner(slug);
      if (slug !== this.slug) return; // navigated away meanwhile
      this.info.set(info);
      this.access.set('ready');
      // Opened from the dashboard's "Scan check-in" picker: start the camera straight away.
      if (this.autostart && this.detectorAvailable) {
        this.autostart = false;
        void this.startCamera();
      }
    } catch (e) {
      if (slug !== this.slug) return;
      this.info.set(null);
      if (isDenied(e)) {
        this.access.set('denied');
      } else {
        this.error.set(toApiError(e).message);
        this.access.set('failed');
      }
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  protected title = (r: ScanResult) => OUTCOME[r.outcome]?.title ?? r.outcome;
  protected tone = (r: ScanResult) => OUTCOME[r.outcome]?.tone ?? 'error';

  async startCamera(): Promise<void> {
    this.error.set(null);
    try {
      const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
      this.detector = new Ctor({ formats: ['qr_code'] });
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      const video = this.video!.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cameraOn.set(true);
      this.loop();
    } catch {
      this.error.set('The camera could not be started. Allow camera access, or use the pass code.');
      this.stopCamera();
    }
  }

  stopCamera(): void {
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.cameraOn.set(false);
  }

  private loop(): void {
    this.timer = setTimeout(async () => {
      if (!this.cameraOn() || !this.detector || !this.video) return;
      if (!this.busy() && !this.result()) {
        try {
          const found = await this.detector.detect(this.video.nativeElement);
          const value = found[0]?.rawValue;
          const now = Date.now();
          if (value && !(value === this.lastValue && now - this.lastAt < 4000)) {
            this.lastValue = value;
            this.lastAt = now;
            await this.submit({ token: value });
          }
        } catch {
          /* a frame that couldn't be read; keep scanning */
        }
      }
      this.loop();
    }, 250);
  }

  async submitCode(): Promise<void> {
    await this.submit({ code: this.code.trim() });
    this.code = '';
  }

  private async submit(credential: { token?: string; code?: string }): Promise<void> {
    if (this.access() !== 'ready') return;
    const slug = this.slug;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.api.checkIn(slug, {
        ...credential,
        idempotency_key: newIdempotencyKey(),
      });
      if (slug !== this.slug) return;
      this.result.set(result);
      void this.refreshInfo();
    } catch (e) {
      if (slug !== this.slug) return;
      if (isDenied(e)) {
        // e.g. the volunteer assignment was removed mid-shift
        this.stopCamera();
        this.info.set(null);
        this.result.set(null);
        this.access.set('denied');
      } else {
        this.error.set(toApiError(e).message);
      }
    } finally {
      this.busy.set(false);
    }
  }

  next(): void {
    this.result.set(null);
  }

  private async refreshInfo(): Promise<void> {
    const slug = this.slug;
    try {
      const info = await this.api.scanner(slug);
      if (slug === this.slug) this.info.set(info);
    } catch (e) {
      if (slug !== this.slug) return;
      if (isDenied(e)) {
        this.stopCamera();
        this.info.set(null);
        this.result.set(null);
        this.access.set('denied');
      }
    }
  }
}
