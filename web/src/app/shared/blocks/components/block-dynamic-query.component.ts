import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ContentApiService } from '../../../core/services/content-api.service';
import { PendingFlagComponent } from '../../ui/pending-flag.component';

type QueryId = 'published_events_upcoming' | 'published_events_past' | 'published_blogs';

interface DynamicQueryProps {
  heading?: string;
  query: QueryId;
  sort?: string;
  limit?: number;
  empty_label?: string;
}

interface EventResult {
  slug: string;
  title: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string;
  summary?: string;
  time_label?: string;
  audience?: string;
  registration_status?: string;
  turnout?: string;
  pending?: boolean;
}

interface BlogResult {
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  author_name?: string;
  external_url?: string;
  pending?: boolean;
  published_at?: string;
}

/**
 * Resolves a `dynamic_query` block through `ContentApiService.getDynamic`,
 * which only ever hits `PublicDynamicQueryView` — the allowlisted server
 * resolver (`apps.content.dynamic_queries`). This component never
 * constructs a query itself; `props.query` is just the identifier the
 * backend allowlist already validated when the document was saved (and
 * re-validates on every request). The HttpClient call runs identically
 * during SSR/prerender and in the browser (`withFetch()`,
 * `app.config.ts`), so the resolved listing is baked into prerendered
 * output, not fetched client-side after hydration.
 *
 * Reuses `.events-list`/`.event-row`/`.meta` and `.grid.grid-3`/`.card`
 * verbatim (`features/events/events.component.html`,
 * `features/blogs/blogs.component.html`), including the same per-field
 * conditionals (time/venue/audience/registration/turnout) and the
 * `ui-pending-flag` marker for `pending` items — the Events page becomes
 * two `dynamic_query` blocks (`published_events_upcoming` +
 * `published_events_past`), matching the legacy page's own two sections.
 */
@Component({
  selector: 'block-dynamic-query',
  standalone: true,
  imports: [CommonModule, PendingFlagComponent],
  template: `
    <section class="section wrap">
      @if (props.heading) {
        <div class="section-heading">
          <h2>{{ props.heading }}</h2>
        </div>
      }
      @if (props.query === 'published_blogs') {
        <div class="events-list" style="margin-top: var(--s-6)">
          @for (post of blogs(); track post.slug) {
            <div class="event-row">
              <span class="date">{{ post.published_at | date: 'MMM d, y' }}</span>
              <div>
                <h3>
                  @if (post.external_url) {
                    <a [href]="post.external_url" target="_blank" rel="noopener">{{
                      post.title
                    }}</a>
                  } @else {
                    {{ post.title }}
                  }
                </h3>
                @if (post.excerpt) {
                  <p style="color: var(--ink-2); margin-top: var(--s-2)">{{ post.excerpt }}</p>
                }
                <div class="meta">
                  @if (post.author_name) {
                    <span>{{ post.author_name }}</span>
                  }
                  @if (post.pending) {
                    <ui-pending-flag label="Illustrative" />
                  }
                </div>
              </div>
            </div>
          } @empty {
            <p>{{ props.empty_label || 'No blog posts yet.' }}</p>
          }
        </div>
      } @else {
        <div class="events-list" style="margin-top: var(--s-6)">
          @for (ev of events(); track ev.slug) {
            <div class="event-row">
              <span class="date">
                @if (ev.starts_at) {
                  {{ ev.starts_at | date: 'MMM d, y' }}
                }
                @if (ev.ends_at) {
                  – {{ ev.ends_at | date: 'MMM d' }}
                }
              </span>
              <div>
                <h3>{{ ev.title }}</h3>
                @if (ev.summary) {
                  <p style="color: var(--ink-2); margin-top: var(--s-2)">{{ ev.summary }}</p>
                }
                <div class="meta">
                  @if (ev.time_label) {
                    <span>{{ ev.time_label }}</span>
                  }
                  @if (ev.venue) {
                    <span>{{ ev.venue }}</span>
                  }
                  @if (ev.audience) {
                    <span>{{ ev.audience }}</span>
                  }
                  @if (ev.registration_status) {
                    <span>Registration: {{ ev.registration_status }}</span>
                  }
                  @if (ev.turnout) {
                    <span>{{ ev.turnout }}</span>
                  }
                  @if (ev.pending) {
                    <ui-pending-flag label="Illustrative" />
                  }
                </div>
              </div>
            </div>
          } @empty {
            <p>{{ props.empty_label || 'No events listed yet.' }}</p>
          }
        </div>
      }
    </section>
  `,
})
export class BlockDynamicQueryComponent implements OnInit {
  @Input({ required: true }) props!: DynamicQueryProps;
  @Input() blockId = '';

  private api = inject(ContentApiService);
  events = signal<EventResult[]>([]);
  blogs = signal<BlogResult[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const response = await this.api.getDynamic<EventResult | BlogResult>(this.props.query, {
      sort: this.props.sort,
      limit: this.props.limit,
    });
    if (this.props.query === 'published_blogs') {
      this.blogs.set(response.results as BlogResult[]);
    } else {
      this.events.set(response.results as EventResult[]);
    }
  }
}
