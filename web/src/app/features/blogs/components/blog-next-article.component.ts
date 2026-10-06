import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-blog-next-article',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="next-article-card">
      <div class="card-inner">
        <div class="next-badge">
          <span class="next-kicker">NEXT IN THE JOURNEY</span>
          <span class="next-part">PART {{ nextPart.part }} OF 4</span>
        </div>

        <h3 class="next-title">
          <a [routerLink]="['/blogs', nextPart.slug]" class="title-link">
            {{ nextPart.title }}
          </a>
        </h3>

        @if (nextPart.teaser) {
          <p class="next-teaser">{{ nextPart.teaser }}</p>
        }

        <div class="next-action-row">
          <a [routerLink]="['/blogs', nextPart.slug]" class="read-next-btn">
            {{ isLoop ? 'START THE SERIES AGAIN → READ PART 1' : 'READ PART ' + nextPart.part + ' →' }}
          </a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .next-article-card {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-lg);
      padding: var(--s-6);
      margin-top: var(--s-8);
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
      transition: all var(--dur-normal) var(--ease-out);
    }
    .next-article-card:hover {
      border-color: var(--accent);
      box-shadow: var(--glow);
    }
    .card-inner {
      display: flex;
      flex-direction: column;
      gap: var(--s-3);
    }
    .next-badge {
      display: flex;
      align-items: center;
      gap: var(--s-2);
    }
    .next-kicker {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
    }
    .next-part {
      font-size: var(--t-micro);
      font-weight: 800;
      color: var(--ink-inverse);
      background: var(--ink);
      padding: 2px 8px;
      border-radius: var(--r-pill);
    }
    .next-title {
      font-size: var(--t-h2);
      font-weight: 800;
      margin: 0;
      line-height: var(--lh-tight);
    }
    .title-link {
      color: var(--ink);
      text-decoration: none;
      transition: color var(--dur-fast) ease;
    }
    .title-link:hover {
      color: var(--accent-ink);
    }
    .next-teaser {
      font-size: var(--t-sm);
      color: var(--ink-2);
      margin: 0;
    }
    .next-action-row {
      margin-top: var(--s-2);
    }
    .read-next-btn {
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
      box-shadow: var(--shadow-sm);
    }
    .read-next-btn:hover {
      background: var(--accent-ink);
      color: var(--on-accent);
      transform: translateX(4px);
    }
  `]
})
export class BlogNextArticleComponent {
  @Input({ required: true }) nextPart!: {
    part: number;
    title: string;
    slug: string;
    teaser?: string;
  };
  @Input() isLoop = false;
}
