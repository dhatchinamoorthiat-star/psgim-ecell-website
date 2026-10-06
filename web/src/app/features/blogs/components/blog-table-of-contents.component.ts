import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ArticleSection } from '../../../core/models/models';

@Component({
  selector: 'app-blog-table-of-contents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="toc-container" [class.open]="isMobileOpen">
      <!-- Mobile Header / Toggle -->
      <button class="mobile-toc-toggle" (click)="toggleMobile()">
        <span class="toc-heading">ON THIS PAGE</span>
        <svg class="chevron" [class.rotated]="isMobileOpen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Section Links -->
      <div class="toc-links-wrapper">
        <ul class="toc-list">
          @for (sec of sections; track sec.id) {
            <li class="toc-item">
              <a [href]="'#' + sec.id" (click)="onLinkClick()" class="toc-link">
                {{ sec.heading }}
              </a>
            </li>
          }
        </ul>
      </div>
    </nav>
  `,
  styles: [`
    .toc-container {
      background: var(--surface);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
      padding: var(--s-4);
      position: sticky;
      top: calc(var(--header-h) + var(--s-4));
    }
    .toc-heading {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      display: block;
      margin-bottom: var(--s-3);
    }
    .mobile-toc-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-align: left;
    }
    .chevron {
      display: none;
      color: var(--ink-2);
      transition: transform var(--dur-fast) ease;
    }
    .chevron.rotated {
      transform: rotate(180deg);
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toc-link {
      font-size: var(--t-xs);
      color: var(--ink-2);
      text-decoration: none;
      line-height: 1.4;
      display: block;
      transition: color var(--dur-fast) ease;
      font-weight: 500;
      border-left: 2px solid transparent;
      padding-left: 8px;
    }
    .toc-link:hover {
      color: var(--accent-ink);
      border-left-color: var(--accent);
    }

    @media (max-width: 1024px) {
      .toc-container {
        position: relative;
        top: 0;
        margin-bottom: var(--s-5);
      }
      .chevron {
        display: block;
      }
      .toc-links-wrapper {
        display: none;
        margin-top: var(--s-3);
      }
      .toc-container.open .toc-links-wrapper {
        display: block;
      }
      .toc-heading {
        margin-bottom: 0;
      }
    }
  `]
})
export class BlogTableOfContentsComponent {
  @Input({ required: true }) sections: ArticleSection[] = [];
  isMobileOpen = false;

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  onLinkClick(): void {
    this.isMobileOpen = false;
  }
}
