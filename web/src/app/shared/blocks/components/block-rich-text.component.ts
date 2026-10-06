import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PendingFlagComponent } from '../../ui/pending-flag.component';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

interface RichTextProps {
  heading?: string;
  paragraphs: string[];
  pending?: boolean;
  pending_label?: string;
}

/** Reuses `.section-heading`/`.kicker`/`h2`/plain `<p>` — the narrative-copy
 * pattern used throughout about/origin/vision/reach today. `pending`
 * reuses the existing `ui-pending-flag` component unchanged — same
 * Pending<T> editorial marker the legacy pages already show.
 *
 * Heading/paragraphs are click-and-type editable directly on the canvas
 * via `ui-inline-text` when `editorHost` is present; on the public site
 * they render as plain `<h2>`/`<p class="lede">`, identical to before. */
@Component({
  selector: 'block-rich-text',
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
      @for (p of props.paragraphs; track $index) {
        <ui-inline-text
          tag="p"
          className="lede"
          [value]="p"
          [editable]="!!editorHost"
          (valueChange)="updateParagraph($index, $event)"
        />
      }
    </section>
  `,
})
export class BlockRichTextComponent {
  @Input({ required: true }) props!: RichTextProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;

  updateParagraph(index: number, value: string): void {
    const paragraphs = [...this.props.paragraphs];
    paragraphs[index] = value;
    this.editorHost?.updateProp?.(this.blockId, 'paragraphs', paragraphs);
  }
}
