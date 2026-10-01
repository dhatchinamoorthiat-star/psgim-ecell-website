import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { EventItem } from '../../core/models/models';
import { events, eventsNote, splitEvents } from '../../core/data/events.data';
import { initiatives } from '../../core/data/initiatives.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { EditorialRowListComponent, EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

function initiativeTag(initiativeId: string): string {
  return initiatives.find((i) => i.id === initiativeId)?.tag ?? 'Event';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toRow(ev: EventItem, index: number): EditorialRowItem {
  const dateRange = formatDate(ev.date) + (ev.endDate ? ` – ${formatDate(ev.endDate)}` : '');
  return {
    id: ev.id,
    index: String(index + 1).padStart(2, '0'),
    title: ev.title,
    summary: ev.summary,
    tag: initiativeTag(ev.initiative),
    when: [dateRange, ev.time, ev.venue].filter(Boolean).join(' · '),
    anchor: `/events/#${ev.id}`,
  };
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, PendingFlagComponent, EditorialRowListComponent],
  templateUrl: './events.component.html',
})
export class EventsComponent implements OnInit {
  eventsNote = eventsNote;
  split = splitEvents(events);
  upcomingRows: EditorialRowItem[] = this.split.upcoming.map(toRow);
  pastRows: EditorialRowItem[] = this.split.past.map(toRow);

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Events',
      description: eventsNote,
      path: '/events/',
    });
  }
}
