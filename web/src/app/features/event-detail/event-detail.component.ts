import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { SeoService } from '../../core/services/seo.service';
import { absoluteUrl } from '../../core/config/site-origin';
import { EventQueryResult } from '../../shared/blocks/block.types';
import { LoadStateComponent } from '../../shared/ui/load-state.component';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

export type EventDetailStatus = 'loading' | 'ready' | 'not-found' | 'error';

/** Same grammar the backend enforces for event slugs; anything else cannot exist. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Public event page, /events/:slug (Phase B, B5).
 *
 * Rendered in the browser only: production is a static Cloudflare Pages
 * upload with no API at build time, so these URLs are served the CSR shell
 * by a `_redirects` rewrite (verified with `wrangler pages dev`). The data is
 * the published projection only (`/api/v1/content/public/events/<slug>`);
 * any non-public slug is an indistinguishable 404 → "not found".
 *
 * All event text is rendered with interpolation (never innerHTML); links and
 * image sources pass through Angular's URL sanitisation on top of the
 * backend's https/site-relative validation.
 */
@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [RouterLink, LoadStateComponent, AwaitingPanelComponent, PendingFlagComponent],
  templateUrl: './event-detail.component.html',
  styles: [
    `
      .event-facts {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: var(--s-2) var(--s-5);
        margin-top: var(--s-6);
      }
      .event-facts dt {
        font-size: var(--t-xs);
        font-weight: 700;
        letter-spacing: var(--track-kicker);
        text-transform: uppercase;
        color: var(--ink-3);
      }
      .event-facts dd {
        margin: 0;
        color: var(--ink);
      }
      .event-description {
        white-space: pre-line;
        max-width: 68ch;
        color: var(--ink-2);
        margin-top: var(--s-6);
      }
      .event-media {
        display: grid;
        gap: var(--s-4);
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        margin-top: var(--s-7);
      }
      .event-media img {
        width: 100%;
        height: auto;
        border-radius: var(--r-md);
        border: 1px solid var(--rule);
      }
      .event-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--s-3);
        margin-top: var(--s-7);
      }
      .event-share {
        margin-top: var(--s-6);
        color: var(--ink-3);
        font-size: var(--t-sm, 0.875rem);
        overflow-wrap: anywhere;
      }
      @media (max-width: 640px) {
        .event-facts {
          grid-template-columns: 1fr;
          gap: var(--s-1);
        }
        .event-facts dd {
          margin-bottom: var(--s-3);
        }
      }
    `,
  ],
})
export class EventDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ContentApiService);
  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  readonly status = signal<EventDetailStatus>('loading');
  readonly event = signal<EventQueryResult | null>(null);
  readonly copied = signal(false);
  private slug = '';

  readonly dateRange = computed(() => {
    const ev = this.event();
    if (!ev?.starts_at) return 'Date to be confirmed';
    return (
      formatDate(ev.starts_at) +
      (ev.ends_at && ev.ends_at !== ev.starts_at ? ` – ${formatDate(ev.ends_at)}` : '')
    );
  });
  readonly shareUrl = computed(() => absoluteUrl(`/events/${this.slug}`));
  readonly paragraphs = computed(() =>
    (this.event()?.description ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
  );

  ngOnInit(): void {
    const sub = this.route.paramMap.subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      void this.load();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  retry(): void {
    void this.load();
  }

  async copyLink(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* clipboard refused: the URL is visible on the page to copy by hand */
    }
  }

  /** Never rejects; every outcome lands in `status`. */
  private async load(): Promise<void> {
    this.event.set(null);
    if (!SLUG.test(this.slug)) {
      this.markNotFound();
      return;
    }
    this.status.set('loading');
    this.seo.set({
      title: 'Event',
      description: 'Event details',
      path: `/events/${this.slug}`,
      robots: 'noindex, follow',
    });
    try {
      const ev = await this.api.getEvent(this.slug);
      this.event.set(ev);
      this.status.set('ready');
      this.seo.set({
        title: ev.title,
        description: ev.summary || `${ev.title} — an event by PSGIM E-Cell.`,
        path: `/events/${this.slug}`,
        robots: ev.pending ? 'noindex, follow' : 'index, follow',
      });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.markNotFound();
      } else {
        this.status.set('error');
      }
    }
  }

  private markNotFound(): void {
    this.status.set('not-found');
    this.seo.set({
      title: 'Event not found',
      description: 'This event is not available.',
      path: '/events/',
      robots: 'noindex, follow',
    });
  }
}
