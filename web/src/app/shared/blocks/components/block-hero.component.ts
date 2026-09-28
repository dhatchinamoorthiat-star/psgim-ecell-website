import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageProp } from '../block.types';
import { BlockImageComponent } from './block-image.component';

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
 */
@Component({
  selector: 'block-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, BlockImageComponent],
  template: `
    <section class="hero wrap" [class.is-center]="props.alignment === 'center'">
      <h1>{{ props.heading }}</h1>
      @if (props.description) {
        <p class="lede">{{ props.description }}</p>
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
}
