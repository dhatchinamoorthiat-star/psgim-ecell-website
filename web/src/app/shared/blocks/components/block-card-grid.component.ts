import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PendingFlagComponent } from '../../ui/pending-flag.component';
import { BlockEditorHost } from '../block-editor-host';
import { InlineTextComponent } from '../../ui/inline-text.component';

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
 * for every card-shaped list.
 *
 * Heading/title/body are click-and-type editable on the canvas via
 * `ui-inline-text`. A card's own `href` stays a real `routerLink` on the
 * public site; in the editor its navigation is disabled (bound to `null`,
 * click prevented) so clicking into a card's text to edit it doesn't also
 * navigate away from the editor. Cards are tracked by index rather than
 * `title` here so editing a title doesn't make `@for` tear down and
 * recreate the card mid-edit. */
@Component({
  selector: 'block-card-grid',
  standalone: true,
  imports: [CommonModule, RouterLink, PendingFlagComponent, InlineTextComponent],
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
      <div class="grid grid-{{ props.columns || 3 }}" style="margin-top: var(--s-6)">
        @for (c of props.cards; track $index) {
          @if (c.href) {
            <a
              [routerLink]="editorHost ? null : c.href"
              class="card"
              (click)="editorHost && $event.preventDefault()"
            >
              <ng-container *ngTemplateOutlet="cardBody; context: { $implicit: c, index: $index }" />
            </a>
          } @else {
            <div class="card">
              <ng-container *ngTemplateOutlet="cardBody; context: { $implicit: c, index: $index }" />
            </div>
          }
        }
      </div>
    </section>

    <ng-template #cardBody let-c let-i="index">
      @if (c.index) {
        <span class="index">{{ c.index }}</span>
      }
      @if (c.tag) {
        <span class="tag">{{ c.tag }}</span>
      }
      @if (c.status) {
        <span class="chip">{{ c.status === 'building' ? 'In progress' : 'Planned' }}</span>
      }
      <ui-inline-text
        tag="h3"
        [value]="c.title"
        [editable]="!!editorHost"
        [singleLine]="true"
        (valueChange)="updateCard(i, 'title', $event)"
      />
      <ui-inline-text
        tag="p"
        className="card-body"
        [value]="c.body"
        [editable]="!!editorHost"
        (valueChange)="updateCard(i, 'body', $event)"
      />
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
  @Input() editorHost: BlockEditorHost | null = null;

  updateCard(index: number, key: 'title' | 'body', value: string): void {
    const cards = this.props.cards.map((c, i) => (i === index ? { ...c, [key]: value } : c));
    this.editorHost?.updateProp?.(this.blockId, 'cards', cards);
  }
}
