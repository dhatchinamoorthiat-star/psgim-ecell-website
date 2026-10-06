import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';
import { StatTileComponent } from '../../ui/stat-tile.component';
import { BlockEditorHost } from '../block-editor-host';

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
 * animation — no new stat visual is introduced.
 *
 * Each tile's `label` is click-and-type editable on the canvas (via
 * `ui-stat-tile`'s own `editable`/`labelChange`); `value`/`count`/`suffix`
 * stay side-panel-only since `count` drives an animated display rather
 * than plain text. Items are tracked by index rather than `label` so
 * editing it doesn't tear the tile down mid-edit. The section heading
 * itself is `sr-only` (screen-reader-only, not visibly shown on the
 * band), so it stays a side-panel field rather than canvas text. */
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
        @for (s of props.items; track $index) {
          <ui-stat-tile
            [value]="s.value"
            [label]="s.label"
            [count]="s.count"
            [suffix]="s.suffix ?? ''"
            [editable]="!!editorHost"
            (labelChange)="updateItem($index, $event)"
          />
        }
      </div>
    </section>
  `,
})
export class BlockStatsComponent {
  @Input({ required: true }) props!: StatsProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;

  updateItem(index: number, label: string): void {
    const items = this.props.items.map((s, i) => (i === index ? { ...s, label } : s));
    this.editorHost?.updateProp?.(this.blockId, 'items', items);
  }
}
