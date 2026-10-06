import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

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
 * a new visual.
 *
 * Heading, year and description are click-and-type editable on the canvas
 * via `ui-inline-text`. Entries are tracked by index rather than
 * `year + what` so editing either field doesn't tear the entry down
 * mid-edit. */
@Component({
  selector: 'block-timeline',
  standalone: true,
  imports: [CommonModule, PendingFlagComponent, InlineTextComponent],
  template: `
    <section class="section wrap">
      @if (props.heading || editorHost) {
        <div class="section-heading">
          <ui-inline-text
            tag="h2"
            [value]="props.heading || ''"
            [editable]="!!editorHost"
            [singleLine]="true"
            (valueChange)="editorHost?.updateProp?.(blockId, 'heading', $event)"
          />
        </div>
      }
      @if (props.pending) {
        <ui-pending-flag [label]="props.pending_label || 'To be confirmed'" />
      }
      <ol class="grid grid-2" style="margin-top: var(--s-6)">
        @for (e of props.entries; track $index) {
          <li class="card">
            <ui-inline-text
              tag="span"
              className="kicker"
              [value]="e.year"
              [editable]="!!editorHost"
              [singleLine]="true"
              (valueChange)="updateEntry($index, 'year', $event)"
            />
            <ui-inline-text
              tag="p"
              styleAttr="margin-top: var(--s-2)"
              [value]="e.what"
              [editable]="!!editorHost"
              (valueChange)="updateEntry($index, 'what', $event)"
            />
          </li>
        }
      </ol>
    </section>
  `,
})
export class BlockTimelineComponent {
  @Input({ required: true }) props!: TimelineProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;

  updateEntry(index: number, key: keyof TimelineEntry, value: string): void {
    const entries = this.props.entries.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    this.editorHost?.updateProp?.(this.blockId, 'entries', entries);
  }
}
