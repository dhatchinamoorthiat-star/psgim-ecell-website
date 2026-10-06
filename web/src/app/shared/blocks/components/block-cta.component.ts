import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

interface CtaProps {
  heading?: string;
  label: string;
  url: string;
}

/**
 * Reuses `.hero-actions`/`.btn.btn-primary` verbatim.
 *
 * Heading/label are click-and-type editable on the canvas via
 * `ui-inline-text`. The button stays a real `routerLink` on the public
 * site; in the editor its navigation is disabled (`routerLink` bound to
 * `null`, click prevented) so clicking the label to edit it doesn't also
 * navigate away from the editor.
 */
@Component({
  selector: 'block-cta',
  standalone: true,
  imports: [CommonModule, RouterLink, InlineTextComponent],
  template: `
    <section class="section wrap" style="text-align:center">
      @if (props.heading || editorHost) {
        <ui-inline-text
          tag="h2"
          [value]="props.heading || ''"
          [editable]="!!editorHost"
          [singleLine]="true"
          (valueChange)="editorHost?.updateProp?.(blockId, 'heading', $event)"
        />
      }
      <div class="hero-actions" style="justify-content:center; margin-top: var(--s-6)">
        <a
          [routerLink]="editorHost ? null : props.url"
          class="btn btn-primary"
          (click)="editorHost && $event.preventDefault()"
        >
          <ui-inline-text
            tag="span"
            [value]="props.label"
            [editable]="!!editorHost"
            [singleLine]="true"
            (valueChange)="editorHost?.updateProp?.(blockId, 'label', $event)"
          />
        </a>
      </div>
    </section>
  `,
})
export class BlockCtaComponent {
  @Input({ required: true }) props!: CtaProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;
}
