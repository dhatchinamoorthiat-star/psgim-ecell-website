import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageProp } from '../block.types';
import { BlockImageComponent } from './block-image.component';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

interface HeroProps {
  heading: string;
  description?: string;
  image?: ImageProp | null;
  cta_label?: string;
  cta_url?: string;
  alignment?: 'left' | 'center';
}

/**
 * Reuses the site's existing non-video hero pattern
 * (`.hero.wrap`/`.kicker`/`.lede`/`.hero-actions`/`.btn`, seen verbatim in
 * `features/gallery/gallery.component.html`) rather than inventing new
 * markup — see docs/13_FRONTEND_ARCHITECTURE.md "no second design system".
 *
 * Heading/description are click-and-type editable directly on the canvas
 * via `ui-inline-text` when `editorHost` is present; on the public site
 * (`editorHost` always null) they render as plain `<h1>`/`<p class="lede">`,
 * identical to before.
 */
@Component({
  selector: 'block-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, BlockImageComponent, InlineTextComponent],
  template: `
    <section class="hero wrap" [class.is-center]="props.alignment === 'center'">
      <ui-inline-text
        tag="h1"
        [value]="props.heading"
        [editable]="!!editorHost"
        [singleLine]="true"
        (valueChange)="editorHost?.updateProp?.(blockId, 'heading', $event)"
      />
      @if (props.description || editorHost) {
        <ui-inline-text
          tag="p"
          className="lede"
          [value]="props.description || ''"
          [editable]="!!editorHost"
          (valueChange)="editorHost?.updateProp?.(blockId, 'description', $event)"
        />
      }
      <block-image [image]="props.image" imgClass="hero-image" />
      @if (props.cta_label && props.cta_url) {
        <div class="hero-actions">
          <a [routerLink]="props.cta_url" class="btn btn-primary">{{ props.cta_label }}</a>
        </div>
      }
    </section>
  `,
})
export class BlockHeroComponent {
  @Input({ required: true }) props!: HeroProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;
}
