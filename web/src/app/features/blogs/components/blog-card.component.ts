import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogArticle } from '../../../core/models/models';

@Component({
  selector: 'app-blog-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="blog-card">
      <div class="card-header">
        <span class="series-name">{{ article.series | uppercase }}</span>
        <span class="part-badge">PART 0{{ article.seriesPart }}</span>
      </div>

      <h3 class="card-title">
        <a [routerLink]="['/blogs', article.slug]" class="title-link">
          {{ article.title }}
        </a>
      </h3>

      <p class="card-subtitle">{{ article.subtitle }}</p>

      <div class="card-footer">
        <div class="meta-info">
          <span>{{ article.category }}</span>
          <span class="dot">•</span>
          <span>{{ article.readTime }}</span>
        </div>
        <a [routerLink]="['/blogs', article.slug]" class="read-link">
          Read Article →
        </a>
      </div>
    </article>
  `,
  styles: [`
    .blog-card {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-md);
      padding: var(--s-5);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all var(--dur-normal) var(--ease-out);
      position: relative;
    }
    .blog-card:hover {
      border-color: var(--accent);
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--s-3);
    }
    .series-name {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-3);
    }
    .part-badge {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 2px 8px;
      border-radius: var(--r-pill);
    }
    .card-title {
      font-size: var(--t-h3);
      font-weight: 800;
      line-height: var(--lh-snug);
      margin: 0 0 var(--s-2);
    }
    .title-link {
      color: var(--ink);
      text-decoration: none;
      transition: color var(--dur-fast) ease;
    }
    .title-link:hover {
      color: var(--accent-ink);
    }
    .card-subtitle {
      font-size: var(--t-sm);
      color: var(--ink-2);
      line-height: var(--lh-body);
      margin: 0 0 var(--s-4);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: var(--s-3);
      border-top: 1px solid var(--rule);
      margin-top: auto;
    }
    .meta-info {
      font-size: var(--t-micro);
      font-weight: 700;
      color: var(--ink-3);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .dot { color: var(--rule-strong); }
    .read-link {
      font-size: var(--t-xs);
      font-weight: 800;
      color: var(--accent-ink);
      text-decoration: none;
      transition: transform var(--dur-fast) ease;
    }
    .blog-card:hover .read-link {
      transform: translateX(3px);
    }
  `]
})
export class BlogCardComponent {
  @Input({ required: true }) article!: BlogArticle;
}
