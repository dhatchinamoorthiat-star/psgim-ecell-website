import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';

interface TimelineEntry {
  year: string;
  what: string;
}

interface TimelineProps {
  heading?: string;
  entries: TimelineEntry[];
  pending?: boolean;
  pending_label?: string;
}

/** Reuses `.section`/`.wrap`/`.section-heading`/`.card` — no dedicated
 * timeline visual exists yet on the public site (the current `history`
 * page renders `TimelineEntry` as plain text, not a rail/graphic), so this
 * stays within the established list/card vocabulary rather than inventing
 * a new visual. */
@Component({
  selector: 'block-timeline',
  standalone: true,
  imports: [CommonModule, PendingFlagComponent],
  template: `
    <section class="section wrap">
      @if (props.heading) {
        <div class="section-heading">
          <h2>{{ props.heading }}</h2>
        </div>
      }
      @if (props.pending) {
        <ui-pending-flag [label]="props.pending_label || 'To be confirmed'" />
      }
      <ol class="grid grid-2" style="margin-top: var(--s-6)">
        @for (e of props.entries; track e.year + e.what) {
          <li class="card">
            <span class="kicker">{{ e.year }}</span>
            <p style="margin-top: var(--s-2)">{{ e.what }}</p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class BlockTimelineComponent {
  @Input({ required: true }) props!: TimelineProps;
  @Input() blockId = '';
}
