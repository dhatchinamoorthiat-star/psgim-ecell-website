import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CtaProps {
  heading?: string;
  label: string;
  url: string;
}

/** Reuses `.hero-actions`/`.btn.btn-primary` verbatim. */
@Component({
  selector: 'block-cta',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section wrap" style="text-align:center">
      @if (props.heading) {
        <h2>{{ props.heading }}</h2>
      }
      <div class="hero-actions" style="justify-content:center; margin-top: var(--s-6)">
        <a [routerLink]="props.url" class="btn btn-primary">{{ props.label }}</a>
      </div>
    </section>
  `,
})
export class BlockCtaComponent {
  @Input({ required: true }) props!: CtaProps;
  @Input() blockId = '';
}
