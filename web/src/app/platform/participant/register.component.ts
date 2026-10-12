import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import {
  MyEventStatus,
  OperationsApiService,
  REGISTRATION_STATE_LABEL,
  formatWhen,
} from '../operations/operations-api.service';

/**
 * /platform/my-events/register/:slug — the authenticated registration step.
 * The public event page links here; signing in first is handled by authGuard
 * (returnUrl). Eligibility is decided by the server; this page only explains it.
 */
@Component({
  selector: 'app-event-register',
  standalone: true,
  imports: [RouterLink],
  template: `
    <p><a routerLink="/platform/my-events">← My events</a></p>
    @if (loading()) {
      <p class="pf-muted" role="status">Checking registration…</p>
    } @else if (notFound()) {
      <div class="pf-card">
        <h1>Event not available</h1>
        <p class="pf-muted">This event doesn't exist or isn't published.</p>
        <a class="pf-btn" href="/events/">All events</a>
      </div>
    } @else if (status(); as s) {
      <div class="pf-card">
        <h1>Register: {{ s.event.title }}</h1>
        <p class="pf-muted">
          {{ when(s.event.starts_at) }}
          @if (s.event.venue) {
            · {{ s.event.venue }}
          }
        </p>
        <p role="status">{{ availabilityText(s) }}</p>
        @if (s.availability.spots_left !== null) {
          <p class="pf-muted">{{ s.availability.spots_left }} place(s) left.</p>
        }
        @if (s.availability.closes_at) {
          <p class="pf-muted">Registration closes {{ when(s.availability.closes_at) }}.</p>
        }

        @if (
          s.registration &&
          (s.registration.status === 'confirmed' || s.registration.status === 'waitlisted')
        ) {
          <div class="pf-alert pf-alert-ok">You're registered ({{ s.registration.status }}).</div>
          <a class="pf-btn pf-btn-primary" [routerLink]="['/platform/my-events', s.registration.id]"
            >View my registration</a
          >
        } @else if (!s.eligibility.eligible) {
          <div class="pf-alert pf-alert-error" role="alert">{{ s.eligibility.reason }}</div>
        } @else if (s.availability.state === 'open' || s.availability.state === 'waitlist') {
          @if (error()) {
            <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
          }
          <p>
            You are registering as
            <strong>{{
              s.eligibility.participant_type === 'student'
                ? 'a PSGIM student'
                : 'an external participant'
            }}</strong
            >.
          </p>
          <button
            class="pf-btn pf-btn-primary"
            type="button"
            [disabled]="busy()"
            (click)="register()"
          >
            {{ s.availability.state === 'waitlist' ? 'Join the waitlist' : 'Confirm registration' }}
          </button>
        }
      </div>
    } @else if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">
        {{ error() }} <button class="pf-btn pf-btn-sm" type="button" (click)="load()">Retry</button>
      </div>
    }
  `,
})
export class RegisterComponent implements OnInit {
  private api = inject(OperationsApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected slug = '';
  protected status = signal<MyEventStatus | null>(null);
  protected loading = signal(true);
  protected busy = signal(false);
  protected notFound = signal(false);
  protected error = signal<string | null>(null);
  protected stateLabel = REGISTRATION_STATE_LABEL;
  protected when = formatWhen;

  /**
   * "Join the waitlist" is only offered to an eligible account that is not already registered.
   * Everyone else sees a plain "full" statement, so the page never promises an action they can't take.
   */
  protected availabilityText(s: MyEventStatus): string {
    const offersWaitlist = s.availability.state === 'waitlist';
    if (offersWaitlist && (!s.eligibility.eligible || s.registration)) return 'This event is full.';
    return this.stateLabel[s.availability.state];
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.status.set(await this.api.myEvent(this.slug));
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 404) this.notFound.set(true);
      else this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async register(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const reg = await this.api.register(this.slug);
      await this.router.navigate(['/platform/my-events', reg.id], {
        queryParams: { registered: 1 },
      });
    } catch (e) {
      this.error.set(toApiError(e).message);
      void this.load();
    } finally {
      this.busy.set(false);
    }
  }
}
