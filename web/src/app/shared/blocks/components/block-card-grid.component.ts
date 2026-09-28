import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingFlagComponent } from '../../ui/pending-flag.component';

interface CardItem {
  title: string;
  body: string;
  tag?: string;
  cadence?: string;
  venue?: string;
  stage?: string;
  status?: 'building' | 'planned';
  index?: string;
  href?: string;
  pending?: boolean;
  pending_label?: string;
}

interface CardGridProps {
  heading?: string;
  columns?: number;
  cards: CardItem[];
}

/** Reuses `.grid.grid-{n}` + `.card` verbatim (`features/home/home.component.html`
 * "what happens" section) — the same primitive the legacy site already uses
 * for every card-shaped list. */
@Component({
  selector: 'block-card-grid',
  standalone: true,
  imports: [CommonModule, RouterLink, PendingFlagComponent],
  template: `
    <section class="section wrap">
      @if (props.heading) {
        <div class="section-heading">
          <h2>{{ props.heading }}</h2>
        </div>
      }
      <div class="grid grid-{{ props.columns || 3 }}" style="margin-top: var(--s-6)">
        @for (c of props.cards; track c.title) {
          @if (c.href) {
            <a [routerLink]="c.href" class="card">
              <ng-container *ngTemplateOutlet="cardBody; context: { $implicit: c }" />
            </a>
          } @else {
            <div class="card">
              <ng-container *ngTemplateOutlet="cardBody; context: { $implicit: c }" />
            </div>
          }
        }
      </div>
    </section>

    <ng-template #cardBody let-c>
      @if (c.index) {
        <span class="index">{{ c.index }}</span>
      }
      @if (c.tag) {
        <span class="tag">{{ c.tag }}</span>
      }
      @if (c.status) {
        <span class="chip">{{ c.status === 'building' ? 'In progress' : 'Planned' }}</span>
      }
      <h3>{{ c.title }}</h3>
      <p style="color: var(--ink-2); margin-top: var(--s-2)">{{ c.body }}</p>
      @if (c.cadence || c.venue) {
        <p style="color: var(--ink-3); font-size: var(--t-xs); margin-top: var(--s-2)">
          @if (c.cadence) {
            {{ c.cadence }}
          }
          @if (c.cadence && c.venue) {
            ·
          }
          @if (c.venue) {
            {{ c.venue }}
          }
        </p>
      }
      @if (c.pending) {
        <ui-pending-flag
          [label]="c.pending_label || 'To be confirmed'"
          style="margin-top: var(--s-2); display: inline-block"
        />
      }
    </ng-template>
  `,
})
export class BlockCardGridComponent {
  @Input({ required: true }) props!: CardGridProps;
  @Input() blockId = '';
}
