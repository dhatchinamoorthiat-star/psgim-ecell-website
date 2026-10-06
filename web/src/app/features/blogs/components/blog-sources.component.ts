import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SourceLink } from '../../../core/models/models';

@Component({
  selector: 'app-blog-sources',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sources-section">
      <h3 class="sources-heading">SOURCES & FURTHER READING</h3>
      <ul class="sources-list">
        @for (src of sources; track src.url) {
          <li class="source-item">
            <svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <a [href]="src.url" target="_blank" rel="noopener noreferrer" class="source-link">
              {{ src.title }}
            </a>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .sources-section {
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
      padding: var(--s-5);
      margin-top: var(--s-7);
    }
    .sources-heading {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-3);
      margin: 0 0 var(--s-3);
    }
    .sources-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .source-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .link-icon {
      color: var(--accent-ink);
      flex-shrink: 0;
    }
    .source-link {
      font-size: var(--t-xs);
      color: var(--ink-2);
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: color var(--dur-fast) ease;
    }
    .source-link:hover {
      color: var(--accent-ink);
    }
  `]
})
export class BlogSourcesComponent {
  @Input({ required: true }) sources: SourceLink[] = [];
}
