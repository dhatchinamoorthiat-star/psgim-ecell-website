import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CaseStudyData } from '../../../core/models/models';

@Component({
  selector: 'app-blog-case-study',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="case-study-card">
      <div class="card-header">
        <div class="company-badge">
          <svg class="briefcase-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          CASE STUDY: {{ caseStudy.company | uppercase }}
        </div>
        @if (caseStudy.foundedYear) {
          <span class="founded-badge">Est. {{ caseStudy.foundedYear }}</span>
        }
      </div>

      <h3 class="case-headline">{{ caseStudy.headline }}</h3>

      @if (caseStudy.founders) {
        <div class="founders-line">
          <span class="label">FOUNDERS:</span>
          <span class="value">{{ caseStudy.founders }}</span>
        </div>
      }

      <div class="narrative-list">
        @for (item of caseStudy.narrative; track item) {
          <div class="narrative-item">
            <span class="item-arrow">→</span>
            <p>{{ item }}</p>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    .case-study-card {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-left: 4px solid var(--accent);
      border-radius: var(--r-md);
      padding: var(--s-5);
      margin: var(--s-6) 0;
      box-shadow: var(--shadow-md);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--s-3);
    }
    .company-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 10px;
      border-radius: var(--r-pill);
    }
    .briefcase-icon {
      color: var(--accent-ink);
    }
    .founded-badge {
      font-size: var(--t-micro);
      color: var(--ink-3);
      font-weight: 700;
    }
    .case-headline {
      font-size: var(--t-h3);
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 var(--s-2);
      line-height: var(--lh-snug);
    }
    .founders-line {
      font-size: var(--t-xs);
      color: var(--ink-2);
      margin-bottom: var(--s-4);
      font-weight: 600;
    }
    .founders-line .label {
      color: var(--ink-3);
      font-weight: 700;
      margin-right: 4px;
    }
    .narrative-list {
      display: flex;
      flex-direction: column;
      gap: var(--s-2);
    }
    .narrative-item {
      display: flex;
      align-items: flex-start;
      gap: var(--s-2);
    }
    .item-arrow {
      color: var(--accent-ink);
      font-weight: 800;
      font-size: 1.1rem;
      line-height: 1.2;
    }
    .narrative-item p {
      font-size: var(--t-sm);
      color: var(--ink-2);
      margin: 0;
      line-height: var(--lh-body);
    }
  `]
})
export class BlogCaseStudyComponent {
  @Input({ required: true }) caseStudy!: CaseStudyData;
}
