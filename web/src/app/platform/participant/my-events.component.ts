import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import {
  MyRegistration,
  OperationsApiService,
  REGISTRATION_STATUS_LABEL,
  formatWhen,
} from '../operations/operations-api.service';

/** /platform/my-events — the participant dashboard (Phase C). */
@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>My events</h1>
        <p class="pf-muted">
          Your registrations and passes. Browse upcoming events on the public Events page.
        </p>
      </div>
      <a class="pf-btn" href="/events/">Browse events</a>
    </div>

    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">
        {{ error() }}
        <button class="pf-btn pf-btn-sm" type="button" (click)="load()">Retry</button>
      </div>
    }

    @if (loading()) {
      <p class="pf-muted" role="status">Loading your events…</p>
    } @else if (!error() && registrations().length === 0) {
      <div class="pf-card">
        <h2>No registrations yet</h2>
        <p class="pf-muted">When you register for an event, it appears here with your pass.</p>
        <a class="pf-btn pf-btn-primary" href="/events/">Find an event</a>
      </div>
    } @else {
      <ul class="me-list">
        @for (r of registrations(); track r.id) {
          <li class="pf-card">
            <div>
              <a [routerLink]="['/platform/my-events', r.id]"
                ><strong>{{ r.event.title }}</strong></a
              >
              <p class="pf-muted">
                {{ when(r.event.starts_at) }}
                @if (r.event.venue) {
                  · {{ r.event.venue }}
                }
              </p>
            </div>
            <div class="me-meta">
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
              <a class="pf-btn pf-btn-sm" [routerLink]="['/platform/my-events', r.id]">
                {{ r.status === 'confirmed' ? 'View pass' : 'Details' }}
              </a>
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .me-list {
        list-style: none;
        margin: 1.5rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      .me-list li {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .me-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
    `,
  ],
})
export class MyEventsComponent implements OnInit {
  private api = inject(OperationsApiService);
  protected registrations = signal<MyRegistration[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected label = REGISTRATION_STATUS_LABEL;
  protected when = formatWhen;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.registrations.set((await this.api.myRegistrations()).results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }
}
