import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BlogArticle } from '../../../core/models/models';

@Component({
  selector: 'app-blog-article-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="article-hero-wrap wrap">
      <div class="hero-grid">
        <div class="hero-content">
          <div class="series-badge-row">
            <span class="series-pill">{{ article.series | uppercase }}</span>
            <span class="part-pill">PART {{ article.seriesPart }} OF {{ article.totalParts }}</span>
          </div>

          <h1 class="hero-title">{{ article.title }}</h1>
          <p class="hero-subtitle">{{ article.subtitle }}</p>

          <div class="hero-meta-bar">
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>{{ article.author }}</span>
            </div>
            <span class="meta-divider">•</span>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{{ article.readTime }}</span>
            </div>
            <span class="meta-divider">•</span>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{{ article.week }}</span>
            </div>
          </div>
        </div>

        <div class="hero-visual-box" [ngClass]="article.heroConcept">
          @switch (article.heroConcept) {
            @case ('split-frame') {
              <div class="illustration-split">
                <div class="side chaotic">
                  <span class="side-tag">Mundane Noise</span>
                  <div class="dots-cloud"></div>
                  <div class="icon-group">
                    <span>⚡</span><span>🚕</span><span>💬</span><span>📦</span>
                  </div>
                </div>
                <div class="side spotlight">
                  <span class="side-tag highlight">Problem Spotlight</span>
                  <div class="spotlight-circle">
                    <svg class="magnifier" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span class="spotlight-text">Friction Identified</span>
                  </div>
                </div>
              </div>
            }
            @case ('fork-in-road') {
              <div class="illustration-fork">
                <div class="path path-a">
                  <span class="path-label">Path A: Imagined Idea (Fog)</span>
                </div>
                <div class="founder-figure">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div class="path path-b active">
                  <span class="path-label">Path B: Real Customer Behavior</span>
                </div>
              </div>
            }
            @case ('scaffolding-structure') {
              <div class="illustration-building">
                <div class="building-block foundation">Solid Problem Foundation</div>
                <div class="scaffolding-frame">
                  <div class="block mvp">Minimal Viable Scope</div>
                  <div class="block business">Operational Systems</div>
                </div>
              </div>
            }
            @case ('sapling-to-tree') {
              <div class="illustration-tree">
                <div class="tree-canopy">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
                    <path d="M12 22v-9"></path>
                    <path d="M12 13a7 7 0 1 0-7-7c0 3.867 3.133 7 7 7z"></path>
                    <path d="M12 13a7 7 0 1 1 7-7c0 3.867-3.133 7-7 7z"></path>
                  </svg>
                  <span class="canopy-title">Sustainable Impact</span>
                </div>
                <div class="roots-system">
                  <span class="root-node">Problem</span>
                  <span class="root-node">Validation</span>
                  <span class="root-node">Building</span>
                </div>
              </div>
            }
          }
          <div class="hero-caption">{{ article.heroTagline }}</div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .article-hero-wrap {
      padding-top: var(--s-7);
      padding-bottom: var(--s-7);
      border-bottom: 1px solid var(--rule);
      margin-bottom: var(--s-7);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: var(--s-7);
      align-items: center;
    }
    .series-badge-row {
      display: flex;
      align-items: center;
      gap: var(--s-2);
      margin-bottom: var(--s-4);
    }
    .series-pill {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-inverse);
      background: var(--ink);
      padding: 4px 10px;
      border-radius: var(--r-pill);
    }
    .part-pill {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 10px;
      border-radius: var(--r-pill);
      border: 1px solid var(--accent);
    }
    .hero-title {
      font-size: clamp(2rem, 1.5rem + 2.5vw, 3.25rem);
      font-weight: 800;
      line-height: var(--lh-tight);
      letter-spacing: var(--track-display);
      color: var(--ink);
      margin: 0 0 var(--s-4);
    }
    .hero-subtitle {
      font-size: var(--t-lede);
      line-height: var(--lh-body);
      color: var(--ink-2);
      margin: 0 0 var(--s-5);
    }
    .hero-meta-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--s-3);
      font-size: var(--t-sm);
      color: var(--ink-2);
      font-weight: 600;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-divider {
      color: var(--rule-strong);
    }

    /* Hero Visual Box Styling */
    .hero-visual-box {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-lg);
      padding: var(--s-5);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      box-shadow: var(--shadow-md);
    }
    .hero-caption {
      margin-top: var(--s-4);
      font-size: var(--t-xs);
      font-weight: 700;
      font-style: italic;
      color: var(--ink-2);
      text-align: center;
      letter-spacing: var(--track-head);
    }

    /* Split Frame Illustration */
    .illustration-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-3);
      width: 100%;
      height: 180px;
    }
    .side {
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-md);
      padding: var(--s-3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .side.chaotic {
      background: var(--paper);
    }
    .side.spotlight {
      background: var(--accent-soft);
      border-color: var(--accent);
      box-shadow: var(--glow);
    }
    .side-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-2);
      position: absolute;
      top: 8px;
    }
    .side-tag.highlight {
      color: var(--accent-ink);
    }
    .icon-group {
      font-size: 1.5rem;
      display: flex;
      gap: var(--s-2);
      margin-top: var(--s-3);
    }
    .spotlight-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--s-2);
      color: var(--accent-ink);
    }
    .spotlight-text {
      font-size: var(--t-xs);
      font-weight: 800;
      text-transform: uppercase;
    }

    /* Fork in Road Illustration */
    .illustration-fork {
      display: flex;
      flex-direction: column;
      gap: var(--s-3);
      width: 100%;
      align-items: center;
    }
    .path {
      width: 100%;
      padding: var(--s-3);
      border-radius: var(--r-md);
      border: 1px solid var(--rule-strong);
      font-size: var(--t-xs);
      font-weight: 700;
      text-align: center;
      color: var(--ink-2);
      background: var(--paper);
    }
    .path.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-ink);
      box-shadow: var(--glow);
    }
    .founder-figure {
      color: var(--ink);
    }

    /* Building Illustration */
    .illustration-building {
      display: flex;
      flex-direction: column;
      gap: var(--s-2);
      width: 100%;
      align-items: center;
    }
    .building-block {
      width: 90%;
      padding: var(--s-3);
      background: var(--accent-soft);
      border: 2px solid var(--accent);
      border-radius: var(--r-md);
      font-size: var(--t-xs);
      font-weight: 800;
      color: var(--accent-ink);
      text-align: center;
    }
    .scaffolding-frame {
      display: flex;
      gap: var(--s-2);
      width: 90%;
    }
    .block {
      flex: 1;
      padding: var(--s-3);
      background: var(--paper);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-md);
      font-size: var(--t-micro);
      font-weight: 700;
      color: var(--ink-2);
      text-align: center;
    }

    /* Sapling Tree Illustration */
    .illustration-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--s-4);
      width: 100%;
    }
    .tree-canopy {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--ink);
    }
    .canopy-title {
      font-size: var(--t-sm);
      font-weight: 800;
      color: var(--accent-ink);
      margin-top: 4px;
    }
    .roots-system {
      display: flex;
      gap: var(--s-2);
    }
    .root-node {
      font-size: var(--t-micro);
      font-weight: 800;
      text-transform: uppercase;
      padding: 4px 8px;
      background: var(--paper);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-pill);
      color: var(--ink-2);
    }

    @media (max-width: 860px) {
      .hero-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BlogArticleHeroComponent {
  @Input({ required: true }) article!: BlogArticle;
}
