import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { events, eventsNote, splitEvents } from '../../core/data/events.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, PendingFlagComponent],
  templateUrl: './events.component.html',
})
export class EventsComponent implements OnInit {
  eventsNote = eventsNote;
  split = splitEvents(events);

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Events',
      description: eventsNote,
      path: '/events/',
    });
  }
}
