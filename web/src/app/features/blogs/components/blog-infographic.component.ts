import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InfographicData } from '../../../core/models/models';

@Component({
  selector: 'app-blog-infographic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <figure class="infographic-container">
      <figcaption class="infographic-caption">
        <span class="diagram-tag">INFOGRAPHIC</span>
        <h4 class="diagram-title">{{ data.title }}</h4>
        @if (data.subtitle) {
          <p class="diagram-subtitle">{{ data.subtitle }}</p>
        }
      </figcaption>

      <div class="diagram-body">
        @switch (data.type) {
          @case ('comparison') {
            <div class="comparison-grid">
              <div class="column left">
                <div class="col-header">{{ data.content.leftTitle }}</div>
                @for (row of data.content.rows; track row.left) {
                  <div class="row-cell left-cell">
                    <span class="cross-icon">✕</span>
                    <p>{{ row.left }}</p>
                  </div>
                }
              </div>
              <div class="column right">
                <div class="col-header highlight">{{ data.content.rightTitle }}</div>
                @for (row of data.content.rows; track row.right) {
                  <div class="row-cell right-cell">
                    <span class="check-icon">✓</span>
                    <p>{{ row.right }}</p>
                  </div>
                }
              </div>
            </div>
          }

          @case ('sources-radial') {
            <div class="sources-radial-grid">
              <div class="center-node">
                <span>{{ data.content.center }}</span>
              </div>
              <div class="nodes-grid">
                @for (node of data.content.nodes; track node.label) {
                  <div class="node-card">
                    <span class="node-num">0{{ $index + 1 }}</span>
                    <strong class="node-label">{{ node.label }}</strong>
                    <span class="node-desc">{{ node.desc }}</span>
                  </div>
                }
              </div>
            </div>
          }

          @case ('mvp-spectrum') {
            <div class="mvp-spectrum-flow">
              @for (stage of data.content.stages; track stage.name) {
                <div class="spectrum-step">
                  <div class="step-badge">{{ stage.complexity }}</div>
                  <strong class="step-name">{{ stage.name }}</strong>
                  <p class="step-desc">{{ stage.desc }}</p>
                  @if (!$last) {
                    <div class="step-arrow">→</div>
                  }
                </div>
              }
            </div>
          }

          @case ('business-stack') {
            <div class="business-stack-list">
              @for (block of data.content.blocks; track block.title) {
                <div class="stack-row">
                  <span class="stack-num">0{{ $index + 1 }}</span>
                  <div class="stack-info">
                    <strong>{{ block.title }}</strong>
                    <p>{{ block.desc }}</p>
                  </div>
                </div>
              }
            </div>
          }

          @case ('unit-economics') {
            <div class="unit-economics-box">
              <div class="eq-row">
                <div class="eq-card green">
                  <strong>{{ data.content.leftBox.title }}</strong>
                  <span>{{ data.content.leftBox.desc }}</span>
                </div>
                <div class="eq-operator">></div>
                <div class="eq-card red">
                  <strong>{{ data.content.rightBox.title }}</strong>
                  <span>{{ data.content.rightBox.desc }}</span>
                </div>
              </div>
              <div class="eq-condition">{{ data.content.condition }}</div>
              <div class="eq-note">{{ data.content.note }}</div>
            </div>
          }

          @case ('growth-chart') {
            <div class="growth-chart-box">
              <div class="chart-stats">
                <div class="stat-col">
                  <span class="stat-val">~500</span>
                  <span class="stat-lbl">{{ data.content.startYear }}</span>
                </div>
                <div class="chart-arrow">━━━━━►</div>
                <div class="stat-col highlight">
                  <span class="stat-val">200,000+</span>
                  <span class="stat-lbl">{{ data.content.endYear }}</span>
                </div>
              </div>
              <div class="jobs-badge">💼 {{ data.content.jobs }}</div>
              <div class="source-note">{{ data.content.source }}</div>
            </div>
          }

          @case ('master-flow') {
            <div class="master-flow-grid">
              @for (step of data.content.steps; track step.stage) {
                <div class="flow-card" [class.active]="$last">
                  <span class="flow-stage">{{ step.stage }}</span>
                  <h5 class="flow-title">{{ step.title }}</h5>
                  <p class="flow-desc">{{ step.desc }}</p>
                </div>
                @if (!$last) {
                  <div class="flow-connector">→</div>
                }
              }
            </div>
          }
        }
      </div>
    </figure>
  `,
  styles: [`
    .infographic-container {
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-lg);
      padding: var(--s-5);
      margin: var(--s-7) 0;
      box-shadow: var(--shadow-md);
    }
    .infographic-caption {
      margin-bottom: var(--s-5);
    }
    .diagram-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 3px 8px;
      border-radius: var(--r-pill);
      display: inline-block;
      margin-bottom: var(--s-1);
    }
    .diagram-title {
      font-size: var(--t-h3);
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 4px;
    }
    .diagram-subtitle {
      font-size: var(--t-xs);
      color: var(--ink-2);
      margin: 0;
    }

    /* Comparison Table */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-3);
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: var(--s-2);
    }
    .col-header {
      font-size: var(--t-xs);
      font-weight: 800;
      text-transform: uppercase;
      padding: var(--s-2) var(--s-3);
      background: var(--paper);
      border-radius: var(--r-sm);
      color: var(--ink-2);
    }
    .col-header.highlight {
      background: var(--accent-soft);
      color: var(--accent-ink);
    }
    .row-cell {
      display: flex;
      align-items: flex-start;
      gap: var(--s-2);
      padding: var(--s-3);
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-sm);
    }
    .left-cell .cross-icon { color: var(--danger); font-weight: 800; }
    .right-cell .check-icon { color: var(--ok); font-weight: 800; }
    .row-cell p { font-size: var(--t-xs); margin: 0; color: var(--ink); line-height: 1.4; }

    /* Sources Radial */
    .sources-radial-grid {
      display: flex;
      flex-direction: column;
      gap: var(--s-4);
      align-items: center;
    }
    .center-node {
      background: var(--accent-soft);
      border: 2px solid var(--accent);
      padding: var(--s-3) var(--s-6);
      border-radius: var(--r-pill);
      font-weight: 800;
      color: var(--accent-ink);
      font-size: var(--t-sm);
    }
    .nodes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-3);
      width: 100%;
    }
    .node-card {
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
      padding: var(--s-3);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .node-num { font-size: var(--t-micro); font-weight: 800; color: var(--accent-ink); }
    .node-label { font-size: var(--t-xs); color: var(--ink); }
    .node-desc { font-size: var(--t-micro); color: var(--ink-2); }

    /* MVP Spectrum Flow */
    .mvp-spectrum-flow {
      display: flex;
      flex-direction: column;
      gap: var(--s-3);
    }
    .spectrum-step {
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
      padding: var(--s-3);
      position: relative;
    }
    .step-badge {
      font-size: var(--t-micro);
      font-weight: 800;
      color: var(--accent-ink);
      background: var(--accent-soft);
      display: inline-block;
      padding: 2px 6px;
      border-radius: var(--r-sm);
      margin-bottom: 4px;
    }
    .step-name { display: block; font-size: var(--t-sm); color: var(--ink); }
    .step-desc { font-size: var(--t-xs); color: var(--ink-2); margin: 0; }
    .step-arrow { text-align: center; color: var(--rule-strong); font-weight: 800; }

    /* Business Stack List */
    .business-stack-list { display: flex; flex-direction: column; gap: var(--s-2); }
    .stack-row {
      display: flex;
      align-items: center;
      gap: var(--s-4);
      padding: var(--s-3);
      background: var(--paper);
      border: 1px solid var(--rule);
      border-radius: var(--r-md);
    }
    .stack-num { font-size: var(--t-body); font-weight: 800; color: var(--accent-ink); }
    .stack-info strong { display: block; font-size: var(--t-sm); color: var(--ink); }
    .stack-info p { font-size: var(--t-xs); color: var(--ink-2); margin: 0; }

    /* Unit Economics Box */
    .unit-economics-box { text-align: center; }
    .eq-row { display: flex; align-items: center; justify-content: center; gap: var(--s-3); margin-bottom: var(--s-3); }
    .eq-card { padding: var(--s-3); border-radius: var(--r-md); flex: 1; }
    .eq-card.green { background: var(--ok-soft); border: 1px solid var(--ok); color: var(--ok); }
    .eq-card.red { background: var(--danger-soft); border: 1px solid var(--danger); color: var(--danger); }
    .eq-card strong { display: block; font-size: var(--t-xs); }
    .eq-card span { font-size: var(--t-micro); }
    .eq-operator { font-size: 1.5rem; font-weight: 800; color: var(--ink); }
    .eq-condition { font-size: var(--t-sm); font-weight: 800; color: var(--accent-ink); margin-bottom: 4px; }
    .eq-note { font-size: var(--t-xs); color: var(--ink-2); }

    /* Growth Chart Box */
    .growth-chart-box { text-align: center; }
    .chart-stats { display: flex; align-items: center; justify-content: center; gap: var(--s-5); margin-bottom: var(--s-4); }
    .stat-col { display: flex; flex-direction: column; }
    .stat-val { font-size: var(--t-h2); font-weight: 800; color: var(--ink); }
    .stat-col.highlight .stat-val { color: var(--accent-ink); }
    .stat-lbl { font-size: var(--t-micro); color: var(--ink-3); }
    .chart-arrow { color: var(--rule-strong); letter-spacing: -2px; }
    .jobs-badge { font-size: var(--t-sm); font-weight: 800; color: var(--ink); margin-bottom: 4px; }
    .source-note { font-size: var(--t-micro); color: var(--ink-3); }

    /* Master Flow Grid */
    .master-flow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-2); }
    .flow-card { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--r-md); padding: var(--s-3); }
    .flow-card.active { border-color: var(--accent); background: var(--accent-soft); }
    .flow-stage { font-size: var(--t-micro); font-weight: 800; color: var(--accent-ink); display: block; margin-bottom: 2px; }
    .flow-title { font-size: var(--t-xs); font-weight: 800; margin: 0 0 4px; color: var(--ink); }
    .flow-desc { font-size: var(--t-micro); color: var(--ink-2); margin: 0; line-height: 1.3; }
    .flow-connector { display: none; }

    @media (max-width: 768px) {
      .comparison-grid, .nodes-grid, .master-flow-grid { grid-template-columns: 1fr; }
      .chart-stats { gap: var(--s-2); }
      .eq-row { flex-direction: column; }
    }
  `]
})
export class BlogInfographicComponent {
  @Input({ required: true }) data!: InfographicData;
}
