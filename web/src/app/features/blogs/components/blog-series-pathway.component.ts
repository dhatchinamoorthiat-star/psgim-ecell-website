import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-blog-series-pathway',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="series-pathway-card wrap">
      <div class="pathway-header">
        <div class="pathway-badge">
          <span class="pathway-dot"></span>
          FEATURED SERIES
        </div>
        <h2 class="pathway-title">FROM IDEA TO IMPACT</h2>
        <p class="pathway-subtitle">A 4-Part Entrepreneurship Series for Student Founders</p>
      </div>

      <div class="pathway-nav">
        @for (stage of stages; track stage.num) {
          <a
            [routerLink]="['/blogs', stage.slug]"
            class="pathway-step"
            [class.active]="activePart === $index + 1"
            [class.completed]="activePart > $index + 1"
          >
            <div class="step-num-row">
              <span class="step-num">{{ stage.num }}</span>
              <span class="step-kicker">{{ stage.kicker }}</span>
            </div>
            <div class="step-label">{{ stage.label }}</div>
            <div class="step-progress-bar">
              <div class="progress-fill" [style.width.%]="activePart >= $index + 1 ? 100 : 0"></div>
            </div>
          </a>
        }
      </div>

      <div class="pathway-tagline">
        <svg class="quote-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h4c0 3.5-2.5 5-5 5.5"></path>
          <path d="M15 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h4c0 3.5-2.5 5-5 5.5"></path>
        </svg>
        <span>"Every business starts as a problem someone refused to ignore."</span>
      </div>
    </div>
  `,
  styles: [`
    .series-pathway-card {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-lg);
      padding: var(--s-6) var(--s-6);
      margin-top: var(--s-6);
      margin-bottom: var(--s-8);
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }
    .series-pathway-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--ocean), #0077ff);
    }
    .pathway-header {
      margin-bottom: var(--s-6);
    }
    .pathway-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--t-micro);
      letter-spacing: var(--track-kicker);
      text-transform: uppercase;
      font-weight: 700;
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 10px;
      border-radius: var(--r-pill);
      margin-bottom: var(--s-2);
    }
    .pathway-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-ink);
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .pathway-title {
      font-size: var(--t-h2);
      font-weight: 800;
      letter-spacing: var(--track-head);
      margin: 0 0 var(--s-1);
      color: var(--ink);
    }
    .pathway-subtitle {
      font-size: var(--t-sm);
      color: var(--ink-2);
      margin: 0;
    }
    .pathway-nav {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--s-4);
      margin-bottom: var(--s-5);
    }
    .pathway-step {
      display: flex;
      flex-direction: column;
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
      padding: var(--s-4);
      text-decoration: none;
      transition: all var(--dur-normal) var(--ease-out);
      position: relative;
    }
    .pathway-step:hover {
      border-color: var(--accent-ink);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .pathway-step.active {
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: var(--glow);
    }
    .step-num-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--s-2);
    }
    .step-num {
      font-size: var(--t-xs);
      font-weight: 800;
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 2px 6px;
      border-radius: var(--r-sm);
    }
    .step-kicker {
      font-size: var(--t-micro);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-3);
      font-weight: 600;
    }
    .step-label {
      font-size: var(--t-sm);
      font-weight: 700;
      color: var(--ink);
      line-height: 1.3;
      margin-bottom: var(--s-3);
    }
    .step-progress-bar {
      height: 4px;
      background: var(--rule);
      border-radius: var(--r-pill);
      overflow: hidden;
      margin-top: auto;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      transition: width var(--dur-normal) var(--ease-out);
    }
    .pathway-tagline {
      display: flex;
      align-items: center;
      gap: var(--s-3);
      padding-top: var(--s-4);
      border-top: 1px dashed var(--rule);
      font-size: var(--t-sm);
      font-weight: 600;
      font-style: italic;
      color: var(--ink-2);
    }
    .quote-icon {
      color: var(--accent-ink);
      flex-shrink: 0;
    }
    @media (max-width: 768px) {
      .pathway-nav {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      .pathway-nav {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BlogSeriesPathwayComponent {
  @Input() activePart: number = 0;

  stages = [
    { num: '01', label: 'SPOT THE PROBLEM', slug: 'from-idea-to-impact-part-1-spot-the-problem', kicker: 'Part 1' },
    { num: '02', label: 'VALIDATE BEFORE YOU BUILD', slug: 'from-idea-to-impact-part-2-validate-before-you-build', kicker: 'Part 2' },
    { num: '03', label: 'BUILD THE BUSINESS', slug: 'from-idea-to-impact-part-3-building-the-business', kicker: 'Part 3' },
    { num: '04', label: 'SUSTAINABLE IMPACT', slug: 'from-idea-to-impact-part-4-sustainable-growth', kicker: 'Part 4' },
  ];
}
