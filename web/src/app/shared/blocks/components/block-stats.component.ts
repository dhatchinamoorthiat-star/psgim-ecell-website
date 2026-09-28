import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';
import { StatTileComponent } from '../../ui/stat-tile.component';

interface StatItem {
  value: string;
  label: string;
  count: number | null;
  suffix?: string;
}

interface StatsProps {
  heading?: string;
  items: StatItem[];
  pending?: boolean;
  pending_label?: string;
}

/** Reuses the existing `ui-stat-tile` component and `.stats-band` layout
 * verbatim (`features/home/home.component.html`), including its count-up
 * animation — no new stat visual is introduced. */
@Component({
  selector: 'block-stats',
  standalone: true,
  imports: [CommonModule, StatTileComponent, PendingFlagComponent],
  template: `
    <section class="section section-band">
      <div class="wrap stats-band">
        @if (props.heading) {
          <h2 class="sr-only">{{ props.heading }}</h2>
        }
        @if (props.pending) {
          <ui-pending-flag [label]="props.pending_label || 'To be confirmed'" />
        }
        @for (s of props.items; track s.label) {
          <ui-stat-tile
            [value]="s.value"
            [label]="s.label"
            [count]="s.count"
            [suffix]="s.suffix ?? ''"
          />
        }
      </div>
    </section>
  `,
})
export class BlockStatsComponent {
  @Input({ required: true }) props!: StatsProps;
  @Input() blockId = '';
}
