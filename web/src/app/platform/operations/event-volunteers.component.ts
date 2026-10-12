import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { OperationsApiService, Volunteer, formatWhen } from './operations-api.service';

/**
 * /platform/events/:slug/volunteers — appoint/remove event volunteers (D7:
 * Vertical Heads, Admin Heads, Super Admins). Volunteers can only scan passes
 * and see the attendee list for this one event, until the assignment expires.
 */
@Component({
  selector: 'app-event-volunteers',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <p><a [routerLink]="['/platform/events', slug, 'attendees']">← Attendees</a></p>
    <div class="pf-page-head">
      <div>
        <h1>Event volunteers</h1>
        <p class="pf-muted">
          Volunteers can scan passes and see the attendee list for this event only. They can't edit,
          publish, export or appoint others.
        </p>
      </div>
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="pf-alert pf-alert-ok" role="status">{{ notice() }}</div>
    }
    <form class="pf-card" (ngSubmit)="add()">
      <h2>Add a volunteer</h2>
      <div class="pf-form-row">
        <div class="pf-field">
          <label for="vol-email">Email of an existing account</label>
          <input
            id="vol-email"
            class="pf-input"
            type="email"
            name="email"
            [(ngModel)]="email"
            required
          />
        </div>
        <div class="pf-field">
          <label for="vol-ends">Access ends (optional)</label>
          <input
            id="vol-ends"
            class="pf-input"
            type="datetime-local"
            name="ends"
            [(ngModel)]="endsAt"
          />
          <small>Default: one day after the event.</small>
        </div>
      </div>
      <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy() || !email.trim()">
        Add volunteer
      </button>
    </form>

    @if (loading()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else if (volunteers().length === 0) {
      <p class="pf-muted" style="margin-top: 1rem">No volunteers yet.</p>
    } @else {
      <table class="pf-table" style="margin-top: 1rem">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Access ends</th>
            <th><span class="pf-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (v of volunteers(); track v.id) {
            <tr>
              <td>{{ v.name }}</td>
              <td>{{ v.email }}</td>
              <td>{{ when(v.ends_at) }}</td>
              <td>
                <button
                  class="pf-btn pf-btn-sm pf-btn-danger"
                  type="button"
                  [disabled]="busy()"
                  (click)="remove(v)"
                >
                  Remove
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class EventVolunteersComponent implements OnInit {
  private api = inject(OperationsApiService);
  private route = inject(ActivatedRoute);
  protected slug = '';
  protected volunteers = signal<Volunteer[]>([]);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected notice = signal<string | null>(null);
  protected email = '';
  protected endsAt = '';
  protected when = formatWhen;

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.volunteers.set((await this.api.volunteers(this.slug)).results);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      const v = await this.api.addVolunteer(
        this.slug,
        this.email.trim(),
        this.endsAt ? new Date(this.endsAt).toISOString() : null,
      );
      this.notice.set(`${v.name} can now scan passes for this event.`);
      this.email = '';
      this.endsAt = '';
      await this.load();
    } catch (e) {
      const err = toApiError(e);
      this.error.set(err.fields['email']?.[0] ?? err.fields['ends_at']?.[0] ?? err.message);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(v: Volunteer): Promise<void> {
    if (!confirm(`Remove ${v.name} as a volunteer?`)) return;
    this.busy.set(true);
    try {
      await this.api.removeVolunteer(this.slug, v.id);
      this.notice.set(`${v.name} was removed.`);
      await this.load();
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }
}
