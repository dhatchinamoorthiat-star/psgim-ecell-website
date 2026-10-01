import { Component, effect, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Rich expanded content. Supplying this switches the row from a link into a
 * disclosure: the row header becomes a button and the CTA moves inside the
 * panel, because a whole-row link and a click-to-expand row cannot coexist.
 */
export interface EditorialRowDetails {
  /** A single paragraph, or several rendered as separate <p> elements. */
  body?: string | string[];
  listTitle?: string;
  list?: string[];
  /** Rendered as a definition list, and only for the facts that exist. */
  facts?: { label: string; value: string }[];
  cta?: { label: string; href: string; fragment?: string };
}

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
  /** Present ⇒ the row is a disclosure, and `href`/`anchor` are ignored on the header. */
  details?: EditorialRowDetails;
}

/**
 * Numbered editorial row list in two modes.
 *
 * Link mode (no `details`): index, title, right-aligned metadata and a summary
 * that expands on hover/focus (desktop) via a 0fr→1fr grid-rows transition.
 * Outside `(hover: hover)` the summary is simply always visible, so the
 * content never depends on hover to be reachable. Ported from the production
 * reference deploy's `.init-row` component.
 *
 * Disclosure mode (`details` supplied): the header is a button carrying
 * aria-expanded/aria-controls over a labelled region, toggled by click or
 * keyboard. The collapsed panel is `inert`, which keeps its links out of the
 * tab order and the accessibility tree while still allowing the open/close
 * transition that `hidden` would prevent.
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
      @if (item.details || item.summary || item.anchor || item.href) {
        <span class="editorial-row__arr" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
      }
    </ng-template>
    <ul class="editorial-row-list">
      @for (item of items(); track item.id) {
        <li class="editorial-row" [id]="item.id" [class.is-open]="isOpen(item.id)">
          @if (item.details) {
            <button
              type="button"
              class="editorial-row__link editorial-row__link--toggle"
              [id]="item.id + '-row'"
              [attr.aria-expanded]="isOpen(item.id)"
              [attr.aria-controls]="item.id + '-panel'"
              (click)="toggle(item.id)"
            >
              <ng-container *ngTemplateOutlet="rowContent; context: { $implicit: item }"></ng-container>
            </button>
            <div
              class="editorial-row__panel"
              role="region"
              [id]="item.id + '-panel'"
              [attr.aria-labelledby]="item.id + '-row'"
              [attr.inert]="isOpen(item.id) ? null : ''"
            >
              <div class="editorial-row__panel-inner">
                @for (paragraph of paragraphs(item.details.body); track paragraph) {
                  <p class="editorial-row__body">{{ paragraph }}</p>
                }
                @if (item.details.facts?.length) {
                  <dl class="editorial-row__facts">
                    @for (fact of item.details.facts; track fact.label) {
                      <div>
                        <dt>{{ fact.label }}</dt>
                        <dd>{{ fact.value }}</dd>
                      </div>
                    }
                  </dl>
                }
                @if (item.details.list?.length) {
                  @if (item.details.listTitle) {
                    <p class="editorial-row__list-title">{{ item.details.listTitle }}</p>
                  }
                  <ul class="editorial-row__list">
                    @for (point of item.details.list; track point) {
                      <li>{{ point }}</li>
                    }
                  </ul>
                }
                @if (item.details.cta; as cta) {
                  <a class="editorial-row__cta" [routerLink]="cta.href" [fragment]="cta.fragment">
                    {{ cta.label }}
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </a>
                }
              </div>
            </div>
          } @else if (item.anchor) {
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
  /**
   * Row to open on arrival, so a deep link like `/initiatives/#idea-clinic`
   * lands on the open row rather than a collapsed one. Scrolling to it is the
   * browser's own fragment handling against the `<li>` id.
   */
  initiallyOpen = input<string | null>(null);

  private readonly open = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      const id = this.initiallyOpen();
      if (id) this.open.update((current) => new Set(current).add(id));
    });
  }

  paragraphs(body: string | string[] | undefined): string[] {
    if (!body) return [];
    return Array.isArray(body) ? body : [body];
  }

  isOpen(id: string): boolean {
    return this.open().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.open());
    if (!next.delete(id)) next.add(id);
    this.open.set(next);
  }
}
