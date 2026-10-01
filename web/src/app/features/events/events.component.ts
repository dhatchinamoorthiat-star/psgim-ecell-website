import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { EventItem } from '../../core/models/models';
import { events, eventsNote, splitEvents } from '../../core/data/events.data';
import { initiatives } from '../../core/data/initiatives.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { EditorialRowListComponent, EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

export type EventFilter = 'all' | 'upcoming' | 'past';

function initiativeTag(initiativeId: string): string {
  return initiatives.find((i) => i.id === initiativeId)?.tag ?? 'Event';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Only the fields the event actually has are passed through, so the expanded
 * panel never renders a label with nothing behind it.
 */
function toRow(ev: EventItem, index: number, isPast: boolean): EditorialRowItem {
  const dateRange = formatDate(ev.date) + (ev.endDate ? ` – ${formatDate(ev.endDate)}` : '');
  const facts: { label: string; value: string }[] = [{ label: 'Date', value: dateRange }];
  if (ev.time) facts.push({ label: 'Time', value: ev.time });
  if (ev.venue) facts.push({ label: 'Venue', value: ev.venue });
  if (ev.audience) facts.push({ label: 'Who', value: ev.audience });
  if (ev.registration) facts.push({ label: 'Registration', value: ev.registration });
  if (ev.turnout) facts.push({ label: 'Turnout', value: ev.turnout });

  return {
    id: ev.id,
    index: String(index + 1).padStart(2, '0'),
    title: ev.title,
    tag: initiativeTag(ev.initiative),
    when: isPast ? formatDate(ev.date) : dateRange,
    details: {
      body: ev.summary,
      facts,
      cta: { label: 'About this programme', href: '/initiatives/', fragment: ev.initiative },
    },
  };
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [RevealOnScrollDirective, PendingFlagComponent, EditorialRowListComponent],
  templateUrl: './events.component.html',
})
export class EventsComponent implements OnInit {
  eventsNote = eventsNote;
  filter = signal<EventFilter>('all');

  private split = splitEvents(events);

  upcomingRows = this.split.upcoming.map((ev, i) => toRow(ev, i, false));
  pastRows = this.split.past.map((ev, i) => toRow(ev, i, true));

  showUpcoming = computed(() => this.filter() !== 'past');
  showPast = computed(() => this.filter() !== 'upcoming');

  readonly filters: { id: EventFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
  ];

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Events',
      description: eventsNote,
      path: '/events/',
    });
  }
}
