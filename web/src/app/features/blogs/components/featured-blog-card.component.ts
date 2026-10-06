import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogArticle } from '../../../core/models/models';

@Component({
  selector: 'app-featured-blog-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="featured-card">
      <div class="card-grid">
        <div class="card-body">
          <div class="card-badge-row">
            <span class="featured-tag">FEATURED ARTICLE</span>
            <span class="part-tag">PART {{ article.seriesPart }} OF {{ article.totalParts }}</span>
          </div>

          <h2 class="card-title">
            <a [routerLink]="['/blogs', article.slug]" class="title-link">
              {{ article.title }}
            </a>
          </h2>

          <p class="card-subtitle">{{ article.subtitle }}</p>

          <div class="card-meta">
            <span>{{ article.category }}</span>
            <span class="meta-dot">•</span>
            <span>{{ article.readTime }}</span>
            <span class="meta-dot">•</span>
            <span>{{ article.week }}</span>
          </div>

          <div class="card-action">
            <a [routerLink]="['/blogs', article.slug]" class="read-btn">
              Read Part {{ article.seriesPart }} →
            </a>
          </div>
        </div>

        <div class="card-visual">
          <div class="visual-wrapper">
            <div class="visual-badge">Opportunity Spotting</div>
            <div class="visual-graphic">
              <div class="graphic-lens">🔍</div>
              <div class="graphic-text">Everyday Annoyance → Business Opportunity</div>
            </div>
            <div class="cases-preview">
              <span>Case Studies: Urban Company • Zerodha</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .featured-card {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-lg);
      padding: var(--s-6);
      margin-bottom: var(--s-7);
      box-shadow: var(--shadow-md);
      transition: all var(--dur-normal) var(--ease-out);
      position: relative;
      overflow: hidden;
    }
    .featured-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 4px;
      background: var(--accent);
    }
    .featured-card:hover {
      border-color: var(--accent);
      box-shadow: var(--glow);
    }
    .card-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: var(--s-6);
      align-items: center;
    }
    .card-badge-row {
      display: flex;
      align-items: center;
      gap: var(--s-2);
      margin-bottom: var(--s-3);
    }
    .featured-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-inverse);
      background: var(--ink);
      padding: 4px 10px;
      border-radius: var(--r-pill);
    }
    .part-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 10px;
      border-radius: var(--r-pill);
      border: 1px solid var(--accent);
    }
    .card-title {
      font-size: clamp(1.75rem, 1.2rem + 1.8vw, 2.5rem);
      font-weight: 800;
      line-height: var(--lh-tight);
      margin: 0 0 var(--s-3);
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
      font-size: var(--t-lede);
      color: var(--ink-2);
      line-height: var(--lh-body);
      margin: 0 0 var(--s-4);
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: var(--s-2);
      font-size: var(--t-xs);
      font-weight: 700;
      color: var(--ink-2);
      margin-bottom: var(--s-5);
    }
    .meta-dot { color: var(--rule-strong); }
    .read-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: var(--t-sm);
      font-weight: 800;
      color: var(--on-accent);
      background: var(--accent);
      padding: var(--s-3) var(--s-5);
      border-radius: var(--r-pill);
      text-decoration: none;
      transition: all var(--dur-fast) ease;
    }
    .read-btn:hover {
      background: var(--accent-ink);
      color: var(--on-accent);
      transform: translateX(4px);
    }
    .card-visual {
      background: var(--paper);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-md);
      padding: var(--s-5);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 220px;
    }
    .visual-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--s-3);
      text-align: center;
    }
    .visual-badge {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 2px 8px;
      border-radius: var(--r-sm);
    }
    .graphic-lens { font-size: 2.5rem; }
    .graphic-text { font-size: var(--t-xs); font-weight: 700; color: var(--ink-2); }
    .cases-preview { font-size: var(--t-micro); color: var(--ink-2); font-weight: 600; }

    @media (max-width: 768px) {
      .card-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class FeaturedBlogCardComponent {
  @Input({ required: true }) article!: BlogArticle;
}
