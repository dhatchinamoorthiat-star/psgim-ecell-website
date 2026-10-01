import { Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface EditorialRowItem {
  id: string;
  index: string;
  title: string;
  /** Omit when there's nothing more to reveal — the hover-expand summary/arrow are skipped. */
  summary?: string;
  /** Omit both `tag` and `when` to render the row without a right-hand metadata column. */
  tag?: string;
  when?: string;
  /** Route to navigate to, e.g. '/initiatives/'. Omit for a same-page anchor (use `anchor` instead). */
  href?: string;
  fragment?: string;
  /**
   * Full same-page anchor href, e.g. '/initiatives/#founders-on-campus' — must include the
   * current path, not just '#id': with the app's `<base href="/">`, a bare '#id' href
   * resolves against the base path and jumps to site root instead of staying on the page.
   */
  anchor?: string;
}

/**
 * Numbered editorial row list — index, title, right-aligned category/metadata,
 * and a summary that expands on hover/focus (desktop) via a 0fr→1fr grid-rows
 * transition. On touch/narrow viewports (outside the `(hover: hover)` media
 * query) the summary is simply always visible, so the interaction never
 * depends on hover to reach the content. Ported from the production
 * reference deploy's `.init-row` component (home page "What we run" teaser).
 */
@Component({
  selector: 'app-editorial-row-list',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #rowContent let-item>
      <span class="editorial-row__index" aria-hidden="true">{{ item.index }}</span>
      <span class="editorial-row__main">
        <span class="editorial-row__title">{{ item.title }}</span>
        @if (item.summary) {
          <span class="editorial-row__summary"><span>{{ item.summary }}</span></span>
        }
      </span>
      @if (item.tag || item.when) {
        <span class="editorial-row__meta">
          @if (item.tag) { <span class="editorial-row__tag">{{ item.tag }}</span> }
          @if (item.when) { <span class="editorial-row__when">{{ item.when }}</span> }
        </span>
      }
      @if (item.summary || item.anchor || item.href) {
        <span class="editorial-row__arr" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
      }
    </ng-template>
    <ul class="editorial-row-list">
      @for (item of items(); track item.id) {
        <li class="editorial-row">
          @if (item.anchor) {
            <a class="editorial-row__link" [href]="item.anchor">
              <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: item }"></ng-container>
            </a>
          } @else if (item.href) {
            <a class="editorial-row__link" [routerLink]="item.href" [fragment]="item.fragment">
              <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: item }"></ng-container>
            </a>
          } @else {
            <div class="editorial-row__link editorial-row__link--static">
              <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: item }"></ng-container>
            </div>
          }
          <span class="editorial-row__rule" aria-hidden="true"></span>
        </li>
      }
    </ul>
  `,
  styleUrl: './editorial-row-list.component.css',
})
export class EditorialRowListComponent {
  items = input.required<EditorialRowItem[]>();
}
