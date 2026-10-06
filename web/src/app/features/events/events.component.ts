import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ContentApiService } from '../../core/services/content-api.service';
import { EventQueryResult } from '../../shared/blocks/block.types';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { EditorialRowListComponent, EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

export type EventFilter = 'all' | 'upcoming' | 'past';

const eventsNote =
  'Confirmed past events, sourced from our LinkedIn posts and the official 2024-25 E-Cell activity report, alongside illustrative placeholders while the rest of the calendar is finalized with the office.';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Only the fields the event actually has are passed through, so the expanded
 * panel never renders a label with nothing behind it. Source is the CMS's
 * `published_events_upcoming`/`published_events_past` dynamic query
 * (backend/apps/content/dynamic_queries.py) — the one canonical event
 * source; nothing here falls back to the old `events.data.ts` array.
 */
function toRow(ev: EventQueryResult, index: number, isPast: boolean): EditorialRowItem {
  const dateRange = ev.starts_at
    ? formatDate(ev.starts_at) + (ev.ends_at ? ` – ${formatDate(ev.ends_at)}` : '')
    : 'Date unconfirmed';
  const facts: { label: string; value: string }[] = [{ label: 'Date', value: dateRange }];
  if (ev.time_label) facts.push({ label: 'Time', value: ev.time_label });
  if (ev.venue) facts.push({ label: 'Venue', value: ev.venue });
  if (ev.audience) facts.push({ label: 'Who', value: ev.audience });
  if (ev.organizer) facts.push({ label: 'Organizer', value: ev.organizer });
  for (const speaker of ev.speakers ?? []) {
    const speakerValue = [speaker.name, speaker.designation, speaker.org].filter(Boolean).join(', ');
    facts.push({ label: 'Speaker', value: speakerValue });
  }
  if (ev.registration_status) facts.push({ label: 'Registration', value: ev.registration_status });
  if (ev.turnout) facts.push({ label: 'Turnout', value: ev.turnout });
  if (ev.pending) facts.push({ label: 'Status', value: 'Illustrative — not a confirmed historical event' });

  const body = ev.description ? [ev.summary ?? '', ev.description] : (ev.summary ?? '');
  const externalCta = ev.registration_link
    ? { label: 'Register', href: ev.registration_link }
    : ev.linkedin_url
      ? { label: 'View on LinkedIn', href: ev.linkedin_url }
      : undefined;

  return {
    id: ev.slug,
    index: String(index + 1).padStart(2, '0'),
    title: ev.title,
    tag: ev.kind || (ev.pending ? 'Illustrative' : 'Event'),
    when: isPast ? (ev.starts_at ? formatDate(ev.starts_at) : 'Date unconfirmed') : dateRange,
    details: {
      body,
      facts,
      images: ev.gallery,
      externalCta,
    },
  };
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [RevealOnScrollDirective, PendingFlagComponent, EditorialRowListComponent, AwaitingPanelComponent],
  templateUrl: './events.component.html',
})
export class EventsComponent implements OnInit {
  eventsNote = eventsNote;
  filter = signal<EventFilter>('all');

  upcomingRows = signal<EditorialRowItem[]>([]);
  pastRows = signal<EditorialRowItem[]>([]);
  loaded = signal(false);

  showUpcoming = computed(() => this.filter() !== 'past');
  showPast = computed(() => this.filter() !== 'upcoming');

  readonly filters: { id: EventFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
  ];

  private seo = inject(SeoService);
  private api = inject(ContentApiService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Events',
      description: eventsNote,
      path: '/events/',
    });
    void this.load();
  }

  private async load(): Promise<void> {
    const [upcoming, past] = await Promise.all([
      this.api.getDynamic<EventQueryResult>('published_events_upcoming', { sort: 'starts_at_asc' }),
      this.api.getDynamic<EventQueryResult>('published_events_past', { sort: 'starts_at_desc' }),
    ]);
    this.upcomingRows.set(upcoming.results.map((ev, i) => toRow(ev, i, false)));
    this.pastRows.set(past.results.map((ev, i) => toRow(ev, i, true)));
    this.loaded.set(true);
  }
}
