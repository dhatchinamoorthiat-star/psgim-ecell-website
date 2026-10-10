import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AwaitingPanelComponent } from './awaiting-panel.component';

/** The two non-content states of an API-backed section. "Ready" is the caller's own markup. */
export type LoadState = 'loading' | 'error';

/**
 * Loading and error presentation for a section whose content comes from the
 * API (events today). Loading shows skeleton rows shaped like the editorial
 * row list, so the page does not jump when real rows arrive; the error state
 * reuses `ui-awaiting-panel` and offers a Retry button. Neither state ever
 * shows placeholder content in place of real data.
 */
@Component({
  selector: 'ui-load-state',
  standalone: true,
  imports: [AwaitingPanelComponent],
  template: `
    @if (state === 'loading') {
      <div class="load-state" role="status" aria-live="polite">
        <span class="sr-only">{{ loadingLabel }}</span>
        <ul class="load-state__rows" aria-hidden="true">
          @for (row of skeletonRows; track $index) {
            <li class="load-state__row">
              <span class="load-state__bar load-state__bar--index"></span>
              <span class="load-state__bar load-state__bar--title"></span>
              <span class="load-state__bar load-state__bar--when"></span>
            </li>
          }
        </ul>
      </div>
    } @else {
      <div role="alert">
        <ui-awaiting-panel [heading]="errorHeading" [message]="errorMessage">
          <button type="button" class="btn btn-ghost load-state__retry" (click)="retry.emit()">
            Retry
          </button>
        </ui-awaiting-panel>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .load-state__rows {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--rule);
      }
      .load-state__row {
        display: grid;
        grid-template-columns: 2.5rem minmax(0, 1fr) 7rem;
        align-items: center;
        gap: var(--s-4);
        padding: var(--s-5) 0;
        border-bottom: 1px solid var(--rule);
      }
      .load-state__bar {
        display: block;
        height: 0.9rem;
        border-radius: var(--r-sm);
        background: var(--surface-3);
        animation: load-state-pulse 1.4s ease-in-out infinite;
      }
      .load-state__bar--title {
        width: min(100%, 26rem);
        height: 1.1rem;
      }
      @media (max-width: 640px) {
        .load-state__row {
          grid-template-columns: 2rem minmax(0, 1fr);
        }
        .load-state__bar--when {
          display: none;
        }
      }
      .load-state__retry {
        margin-top: var(--s-4);
      }
      @keyframes load-state-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.45;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .load-state__bar {
          animation: none;
        }
      }
    `,
  ],
})
export class LoadStateComponent {
  @Input() state: LoadState = 'loading';
  @Input() rows = 3;
  @Input() loadingLabel = 'Loading…';
  @Input() errorHeading = 'Something went wrong';
  @Input() errorMessage = 'This section could not be loaded. Please try again.';
  @Output() retry = new EventEmitter<void>();

  get skeletonRows(): unknown[] {
    return Array.from({ length: this.rows });
  }
}
