import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { OperatedEvent, OperationsApiService, formatWhen } from './operations-api.service';

/** /platform/operations — events where the user holds any operational permission (incl. volunteers). */
@Component({
  selector: 'app-operations-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Event operations</h1>
        <p class="pf-muted">Check-in, attendees and registration for the events you help run.</p>
      </div>
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @if (loading()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else if (events().length === 0 && !error()) {
      <div class="pf-card"><p class="pf-muted">You aren't assigned to any events.</p></div>
    } @else {
      <ul class="op-list">
        @for (e of events(); track e.slug) {
          <li class="pf-card">
            <div>
              <strong>{{ e.title }}</strong>
              <p class="pf-muted">
                {{ when(e.starts_at) }}
                @if (e.venue) {
                  · {{ e.venue }}
                }
                @if (!e.is_published) {
                  · <em>not published</em>
                }
              </p>
            </div>
            <div class="pf-toolbar">
              @if (e.permissions.includes('event.checkin')) {
                <a
                  class="pf-btn pf-btn-primary pf-btn-sm"
                  [routerLink]="['/platform/events', e.slug, 'scan']"
                  >Scan</a
                >
              }
              @if (e.permissions.includes('event.registration.view')) {
                <a class="pf-btn pf-btn-sm" [routerLink]="['/platform/events', e.slug, 'attendees']"
                  >Attendees</a
                >
              }
              @if (e.permissions.includes('event.operations.manage')) {
                <a
                  class="pf-btn pf-btn-sm"
                  [routerLink]="['/platform/events', e.slug, 'operations']"
                  >Settings</a
                >
              }
              @if (e.permissions.includes('event_staff.assign')) {
                <a
                  class="pf-btn pf-btn-sm"
                  [routerLink]="['/platform/events', e.slug, 'volunteers']"
                  >Volunteers</a
                >
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .op-list {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }
      .op-list li {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
      }
    `,
  ],
})
export class OperationsListComponent implements OnInit {
  private api = inject(OperationsApiService);
  protected events = signal<OperatedEvent[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected when = formatWhen;

  async ngOnInit(): Promise<void> {
    try {
      this.events.set((await this.api.operatedEvents()).results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }
}
