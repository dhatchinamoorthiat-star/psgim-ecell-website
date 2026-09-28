import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';

interface RichTextProps {
  heading?: string;
  paragraphs: string[];
  pending?: boolean;
  pending_label?: string;
}

/** Reuses `.section-heading`/`.kicker`/`h2`/plain `<p>` — the narrative-copy
 * pattern used throughout about/origin/vision/reach today. `pending`
 * reuses the existing `ui-pending-flag` component unchanged — same
 * Pending<T> editorial marker the legacy pages already show. */
@Component({
  selector: 'block-rich-text',
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
      @for (p of props.paragraphs; track $index) {
        <p class="lede">{{ p }}</p>
      }
    </section>
  `,
})
export class BlockRichTextComponent {
  @Input({ required: true }) props!: RichTextProps;
  @Input() blockId = '';
}
