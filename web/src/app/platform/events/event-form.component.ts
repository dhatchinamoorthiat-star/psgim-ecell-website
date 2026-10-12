import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, ApiService, toApiError } from '../core/api.service';
import { Vertical } from '../core/api.types';
import { AuthService } from '../core/auth.service';
import {
  AdminEvent,
  EventDetailFields,
  EventsAdminApiService,
  statusLabel,
  writableDetail,
} from './events-admin-api.service';

/** The fields this minimal form edits; anything else in the detail is preserved as-is. */
interface FormModel {
  title: string;
  kind: string;
  starts_at: string; // datetime-local value
  ends_at: string;
  time_label: string;
  venue: string;
  audience: string;
  organizer: string;
  summary: string;
  description: string;
  registration_status: string;
  registration_link: string;
  linkedin_url: string;
  featured_image: string;
}

const EMPTY: FormModel = {
  title: '',
  kind: '',
  starts_at: '',
  ends_at: '',
  time_label: '',
  venue: '',
  audience: '',
  organizer: '',
  summary: '',
  description: '',
  registration_status: '',
  registration_link: '',
  linkedin_url: '',
  featured_image: '',
};

/** ISO (UTC) → value for <input type="datetime-local"> in the browser's zone. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/**
 * /platform/events/new and /platform/events/:slug — the minimal event editor
 * (Phase B, B7). Edits the draft only; the live page changes only when an
 * approved version is published. Review/approval happen in Approvals.
 * Scheduling is deliberately absent: there is no executor yet (P6).
 */
@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  providers: [EventsAdminApiService],
  template: `
    <p><a routerLink="/platform/events">← Events</a></p>
    <div class="pf-page-head">
      <div>
        <h1>{{ isNew() ? 'New event' : model.title || slug }}</h1>
        @if (event(); as ev) {
          <p class="pf-muted">
            <span class="pf-chip">{{ status() }}</span>
            @if (ev.is_published) {
              · <a [href]="'/events/' + ev.slug" target="_blank" rel="noopener">View live page</a>
            }
            @if (auth.canAnywhere('event.operations.manage')) {
              ·
              <a [routerLink]="['/platform/events', ev.slug, 'operations']"
                >Registration & check-in</a
              >
            }
            @if (auth.canAnywhere('event.registration.view')) {
              · <a [routerLink]="['/platform/events', ev.slug, 'attendees']">Attendees</a>
            }
          </p>
        }
      </div>
    </div>

    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="pf-alert" role="status">{{ notice() }}</div>
    }

    @if (loading()) {
      <p class="pf-muted" role="status">Loading…</p>
    } @else {
      <form class="pf-card" (ngSubmit)="save()" novalidate>
        @if (isNew()) {
          <div class="pf-form-row">
            <div class="pf-field">
              <label for="ev-slug">URL slug</label>
              <input
                id="ev-slug"
                class="pf-input"
                name="slug"
                [(ngModel)]="newSlug"
                required
                pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                [attr.aria-invalid]="!!fieldError('slug')"
              />
              <small
                >Becomes /events/{{ newSlug || 'your-slug' }}. Lowercase letters, digits and
                hyphens; cannot be changed later.</small
              >
              @if (fieldError('slug')) {
                <small class="pf-field-error">{{ fieldError('slug') }}</small>
              }
            </div>
            @if (verticals().length > 0) {
              <div class="pf-field">
                <label for="ev-vertical">Owner vertical</label>
                <select id="ev-vertical" class="pf-input" name="vertical" [(ngModel)]="newVertical">
                  <option [ngValue]="null">Organisation-wide</option>
                  @for (v of verticals(); track v.id) {
                    <option [ngValue]="v.id">{{ v.name }}</option>
                  }
                </select>
              </div>
            }
          </div>
        }

        @for (f of textFields; track f.key) {
          <div class="pf-field">
            <label [for]="'ev-' + f.key">{{ f.label }}</label>
            @if (f.multiline) {
              <textarea
                [id]="'ev-' + f.key"
                class="pf-textarea"
                [name]="f.key"
                rows="5"
                [(ngModel)]="model[f.key]"
                [attr.aria-invalid]="!!fieldError(f.key)"
              ></textarea>
            } @else {
              <input
                [id]="'ev-' + f.key"
                class="pf-input"
                [name]="f.key"
                [type]="f.type ?? 'text'"
                [(ngModel)]="model[f.key]"
                [attr.aria-invalid]="!!fieldError(f.key)"
              />
            }
            @if (f.hint) {
              <small>{{ f.hint }}</small>
            }
            @if (fieldError(f.key)) {
              <small class="pf-field-error">{{ fieldError(f.key) }}</small>
            }
          </div>
        }

        <p class="pf-muted">
          Scheduled publishing is not available yet — publish an approved event when it should go
          live.
        </p>

        <div class="pf-toolbar">
          <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()">
            {{ isNew() ? 'Create draft' : 'Save draft' }}
          </button>
          @if (!isNew() && event()?.draft?.state === 'DRAFT') {
            <button class="pf-btn" type="button" [disabled]="busy()" (click)="act('submit')">
              Submit for review
            </button>
          }
          @if (event()?.draft?.state === 'APPROVED' && auth.canAnywhere('content.publish')) {
            <button
              class="pf-btn pf-btn-primary"
              type="button"
              [disabled]="busy()"
              (click)="act('publish')"
            >
              Publish
            </button>
          }
          @if (event()?.is_published && auth.canAnywhere('content.publish')) {
            <button class="pf-btn" type="button" [disabled]="busy()" (click)="act('unpublish')">
              Unpublish
            </button>
          }
          @if (!isNew() && event()?.state !== 'ARCHIVED' && auth.canAnywhere('event.delete')) {
            <button
              class="pf-btn pf-btn-danger"
              type="button"
              [disabled]="busy()"
              (click)="act('archive')"
            >
              Archive
            </button>
          }
        </div>
      </form>
    }
  `,
})
export class EventFormComponent implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(EventsAdminApiService);
  private platformApi = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected slug = '';
  protected readonly isNew = signal(true);
  protected readonly event = signal<AdminEvent | null>(null);
  protected readonly verticals = signal<Vertical[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly fields = signal<Record<string, string[]>>({});
  protected readonly status = computed(() => (this.event() ? statusLabel(this.event()!) : ''));

  protected model: FormModel = { ...EMPTY };
  protected newSlug = '';
  protected newVertical: string | null = null;

  protected readonly textFields: {
    key: keyof FormModel;
    label: string;
    type?: string;
    multiline?: boolean;
    hint?: string;
  }[] = [
    { key: 'title', label: 'Title' },
    { key: 'kind', label: 'Kind', hint: 'e.g. Talk, Workshop, Competition' },
    { key: 'starts_at', label: 'Starts', type: 'datetime-local' },
    { key: 'ends_at', label: 'Ends', type: 'datetime-local' },
    { key: 'time_label', label: 'Time (display text)', hint: 'Shown as written, e.g. "6:00 PM"' },
    { key: 'venue', label: 'Venue' },
    { key: 'audience', label: 'Who it is for' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'summary', label: 'Summary', multiline: true },
    {
      key: 'description',
      label: 'Description',
      multiline: true,
      hint: 'Plain text. Blank lines separate paragraphs.',
    },
    {
      key: 'registration_status',
      label: 'Registration status',
      hint: 'Display text only, e.g. "Open"',
    },
    {
      key: 'registration_link',
      label: 'External registration link',
      type: 'url',
      hint: 'https:// only',
    },
    { key: 'linkedin_url', label: 'LinkedIn post', type: 'url', hint: 'https:// only' },
    {
      key: 'featured_image',
      label: 'Featured image',
      hint: 'https:// URL or a site path such as /events/slug/01.jpg',
    },
  ];

  /** The detail the form started from (draft, else live) — preserves fields this form doesn't edit. */
  private base: EventDetailFields | null = null;
  private baseUpdatedAt: string | null = null;

  async ngOnInit(): Promise<void> {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.isNew.set(!this.slug);
    try {
      if (this.isNew()) {
        this.verticals.set((await this.platformApi.verticals()).results);
      } else {
        this.apply(await this.api.get(this.slug));
      }
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected fieldError(key: string): string | null {
    const f = this.fields();
    return (
      (f[key] ?? f[`detail.${key}`] ?? f['detail']?.filter((m) => m.startsWith(key)))?.[0] ?? null
    );
  }

  async save(): Promise<void> {
    await this.run(async () => {
      const detail = this.toDetail();
      if (this.isNew()) {
        const ev = await this.api.create(this.newSlug.trim(), detail, this.newVertical);
        await this.router.navigate(['/platform/events', ev.slug]);
        return 'Draft created.';
      }
      this.apply(await this.api.update(this.slug, detail, this.baseUpdatedAt));
      return 'Draft saved. The live page is unchanged until an approved version is published.';
    });
  }

  async act(action: 'submit' | 'publish' | 'unpublish' | 'archive'): Promise<void> {
    if (
      action === 'archive' &&
      !confirm('Archive this event? It is unpublished and kept in history; nothing is deleted.')
    ) {
      return;
    }
    await this.run(async () => {
      this.apply(await this.api[action](this.slug));
      return {
        submit: 'Submitted for review. Approve it in Approvals.',
        publish: 'Published. It now appears on the public Events page.',
        unpublish: 'Unpublished. It no longer appears publicly.',
        archive: 'Archived.',
      }[action];
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
      this.error.set(
        err.code === 'stale_version'
          ? 'Someone else changed this draft since you opened it. Reload to see their changes before saving.'
          : err.message,
      );
    } finally {
      this.busy.set(false);
    }
  }

  private apply(ev: AdminEvent): void {
    this.event.set(ev);
    this.slug = ev.slug;
    const version = ev.draft ?? ev.published;
    this.base = version ? writableDetail(version.detail) : null;
    this.baseUpdatedAt = ev.draft?.updated_at ?? null;
    const d = version?.detail ?? { title: '' };
    this.model = {
      ...EMPTY,
      title: d.title ?? '',
      kind: d.kind ?? '',
      starts_at: toLocalInput(d.starts_at),
      ends_at: toLocalInput(d.ends_at),
      time_label: d.time_label ?? '',
      venue: d.venue ?? '',
      audience: d.audience ?? '',
      organizer: d.organizer ?? '',
      summary: d.summary ?? '',
      description: d.description ?? '',
      registration_status: d.registration_status ?? '',
      registration_link: d.registration_link ?? '',
      linkedin_url: d.linkedin_url ?? '',
      featured_image: d.featured_image ?? '',
    };
  }

  private toDetail(): EventDetailFields {
    const m = this.model;
    return {
      ...(this.base ?? {}),
      title: m.title.trim(),
      kind: m.kind.trim(),
      starts_at: fromLocalInput(m.starts_at),
      ends_at: fromLocalInput(m.ends_at),
      time_label: m.time_label.trim(),
      venue: m.venue.trim(),
      audience: m.audience.trim(),
      organizer: m.organizer.trim(),
      summary: m.summary.trim(),
      description: m.description.trim(),
      registration_status: m.registration_status.trim(),
      registration_link: m.registration_link.trim(),
      linkedin_url: m.linkedin_url.trim(),
      featured_image: m.featured_image.trim(),
    };
  }
}
