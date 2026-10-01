import { Component, input } from '@angular/core';
import { RevealOnScrollDirective } from '../../../core/directives/reveal.directive';

export interface EditorialTimelineEntry {
  year: string;
  what: string;
}

/**
 * Vertical editorial timeline — year, a continuous rule with a marker per
 * entry, and the milestone alongside. Each entry reveals on scroll, so the
 * rule reads as progressing down the page rather than animating on a timer.
 * An ordered list, because the sequence is the meaning.
 */
@Component({
  selector: 'app-editorial-timeline',
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: `
    <ol class="editorial-timeline">
      @for (entry of entries(); track entry.year) {
        <li class="editorial-timeline__item" revealOnScroll>
          <span class="editorial-timeline__year">{{ entry.year }}</span>
          <span class="editorial-timeline__marker" aria-hidden="true"></span>
          <p class="editorial-timeline__what">{{ entry.what }}</p>
        </li>
      }
    </ol>
  `,
  styleUrl: './editorial-timeline.component.css',
})
export class EditorialTimelineComponent {
  entries = input.required<EditorialTimelineEntry[]>();
}
