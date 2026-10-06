import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VerticalEcosystem } from '../../../core/models/models';

/**
 * A vertical panel. Communicates purpose, not staffing or performance: the
 * card previously showed a `head` portrait, a head name and invented metrics,
 * none of which exist.
 *
 * Two intentional variants, chosen by whether the vertical has artwork of its
 * own (`heroImage`):
 *  - image panel — the four verticals with real illustrations
 *  - typographic panel — Public Relations, which has none. It is composed as
 *    a deliberate type panel rather than being handed another section's
 *    artwork to even out the row.
 *
 * Colours come from tokens only. The old version hardcoded
 * `rgba(10,27,51,…)` scrims and `#ffffff` text — a stale navy that is no
 * longer a token — which sat over a pale-gold `--surface-2` in light mode.
 * The scrim existed to make text readable over portraits; with no portraits,
 * text and image are separated instead of stacked.
 *
 * NOTE (Phase 3): composition and motion are rebuilt in the visual phase.
 * This revision exists to remove fabricated content without leaving the
 * build broken.
 */
@Component({
  selector: 'app-vertical-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/meet-the-team/vertical', vertical.slug]"
      class="v-panel"
      [class.v-panel--type]="!vertical.heroImage"
      [attr.aria-label]="'What the ' + vertical.name + ' vertical does'"
    >
      @if (vertical.heroImage) {
        <span class="v-panel__figure">
          <img
            [src]="vertical.heroImage"
            [alt]="vertical.name + ' vertical'"
            class="v-panel__img"
            loading="lazy"
            decoding="async"
          />
        </span>
      }

      <span class="v-panel__body">
        <span class="v-panel__index" aria-hidden="true">{{ indexLabel }}</span>
        <span class="v-panel__name">{{ vertical.name }}</span>
        <span class="v-panel__desc">{{ vertical.description }}</span>
        <span class="v-panel__cta">
          What this vertical does
          <span class="v-panel__arrow" aria-hidden="true">→</span>
        </span>
      </span>
    </a>
  `,
  styles: [
    `
      .v-panel {
        display: grid;
        grid-template-rows: auto 1fr;
        background: var(--surface);
        border: 1px solid var(--rule);
        border-radius: var(--r-lg);
        overflow: hidden;
        text-decoration: none;
        color: var(--ink);
        box-shadow: var(--shadow-sm);
        height: 100%;
        transition:
          transform 240ms var(--ease-out),
          box-shadow 240ms var(--ease-out),
          border-color 240ms var(--ease-out);
      }
      .v-panel:hover {
        transform: translateY(-4px);
        border-color: var(--rule-strong);
        box-shadow: var(--shadow-md);
      }
      .v-panel:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }

      .v-panel__figure {
        display: block;
        aspect-ratio: 16 / 10;
        overflow: hidden;
        background: var(--surface-3);
        border-bottom: 1px solid var(--rule);
      }
      .v-panel__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .v-panel__body {
        display: flex;
        flex-direction: column;
        gap: var(--s-2);
        padding: var(--s-5);
      }
      .v-panel__index {
        font-family: var(--font-display);
        font-size: var(--t-xs);
        font-weight: 800;
        letter-spacing: var(--track-kicker);
        color: var(--accent-ink);
      }
      .v-panel__name {
        font-family: var(--font-display);
        font-size: var(--t-h3);
        font-weight: 800;
        line-height: 1.15;
        color: var(--ink);
      }
      .v-panel__desc {
        color: var(--ink-2);
        font-size: var(--t-sm);
        line-height: var(--lh-body);
      }
      .v-panel__cta {
        margin-top: auto;
        padding-top: var(--s-3);
        font-size: var(--t-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--accent-ink);
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
      .v-panel:hover .v-panel__arrow {
        transform: translateX(3px);
      }
      .v-panel__arrow {
        transition: transform 200ms var(--ease-out);
      }

      /* Typographic variant — no artwork, so the type carries the panel. */
      .v-panel--type {
        grid-template-rows: 1fr;
        background: var(--surface-2);
      }
      .v-panel--type .v-panel__body {
        padding: var(--s-6) var(--s-5);
      }
      .v-panel--type .v-panel__name {
        font-size: var(--t-h2);
      }

      @media (prefers-reduced-motion: reduce) {
        .v-panel,
        .v-panel__arrow {
          transition: none;
        }
        .v-panel:hover {
          transform: none;
        }
      }
    `,
  ],
})
export class VerticalCardComponent {
  @Input({ required: true }) vertical!: VerticalEcosystem;
  @Input() index = 0;

  protected get indexLabel(): string {
    return String(this.index + 1).padStart(2, '0');
  }
}
