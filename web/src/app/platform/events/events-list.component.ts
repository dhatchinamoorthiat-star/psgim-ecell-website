import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AdminEvent, EventsAdminApiService, statusLabel } from './events-admin-api.service';

/**
 * /platform/events — every event the caller may see (server-scoped by
 * event.view). Read-only list; creating and editing happen on the form.
 */
@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [RouterLink],
  providers: [EventsAdminApiService],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Events</h1>
        <p class="pf-muted">
          Draft, review and publish events. Review and approval happen in Approvals; published
          events appear on the public Events page.
        </p>
      </div>
      @if (auth.canAnywhere('event.create')) {
        <a class="pf-btn pf-btn-primary" routerLink="/platform/events/new">New event</a>
      }
    </div>

    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }

    @if (loading()) {
      <p class="pf-muted" role="status">Loading events…</p>
    } @else if (events().length === 0 && !error()) {
      <div class="pf-card"><p class="pf-muted">No events yet.</p></div>
    } @else {
      <div class="pf-card">
        <ul class="ev-list">
          @for (ev of events(); track ev.id) {
            <li>
              <a [routerLink]="['/platform/events', ev.slug]">
                <strong>{{ (ev.draft ?? ev.published)?.detail?.title || ev.slug }}</strong>
              </a>
              <span class="pf-muted"
                ><code>/events/{{ ev.slug }}</code></span
              >
              <span class="pf-chip">{{ label(ev) }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      .ev-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .ev-list li {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--rule);
      }
      .ev-list li:last-child {
        border-bottom: 0;
      }
    `,
  ],
})
export class EventsListComponent implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(EventsAdminApiService);

  protected events = signal<AdminEvent[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected label = statusLabel;

  async ngOnInit(): Promise<void> {
    try {
      this.events.set((await this.api.list()).results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }
}
