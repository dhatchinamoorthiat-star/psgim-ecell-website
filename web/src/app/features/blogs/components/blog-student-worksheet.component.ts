import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StudentExerciseItem } from '../../../core/models/models';

@Component({
  selector: 'app-blog-student-worksheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="worksheet-card">
      <div class="worksheet-badge-row">
        <span class="field-guide-tag">FIELD GUIDE</span>
        <span class="action-tag">ACTIONABLE WORKSHEET</span>
      </div>

      <h2 class="worksheet-heading">{{ heading }}</h2>
      <p class="worksheet-subtitle">{{ subtitle }}</p>

      <div class="items-grid">
        @for (item of items; track item.num) {
          <div class="worksheet-item" [class.checked]="checkedState[$index]">
            <div class="item-header">
              <span class="item-num">{{ item.num }}</span>
              <h3 class="item-title">{{ item.title || 'Step ' + item.num }}</h3>
              <label class="checkbox-label" (click)="toggleCheck($index)">
                <input type="checkbox" [checked]="checkedState[$index]" (change)="toggleCheck($index)" />
                <span class="custom-box">
                  <svg *ngIf="checkedState[$index]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span class="check-text">{{ checkedState[$index] ? 'Completed' : 'Done' }}</span>
              </label>
            </div>
            <p class="item-text">{{ item.text }}</p>
          </div>
        }
      </div>

      @if (outcome) {
        <div class="worksheet-outcome">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p>{{ outcome }}</p>
        </div>
      }
    </section>
  `,
  styles: [`
    .worksheet-card {
      background: var(--surface);
      border: 2px solid var(--accent);
      border-radius: var(--r-lg);
      padding: var(--s-6);
      margin: var(--s-8) 0;
      box-shadow: var(--shadow-lg);
      position: relative;
    }
    .worksheet-badge-row {
      display: flex;
      gap: var(--s-2);
      margin-bottom: var(--s-3);
    }
    .field-guide-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--ink-inverse);
      background: var(--ink);
      padding: 4px 10px;
      border-radius: var(--r-pill);
    }
    .action-tag {
      font-size: var(--t-micro);
      font-weight: 800;
      letter-spacing: var(--track-kicker);
      color: var(--accent-ink);
      background: var(--accent-soft);
      padding: 4px 10px;
      border-radius: var(--r-pill);
      border: 1px solid var(--accent);
    }
    .worksheet-heading {
      font-size: var(--t-h2);
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 var(--s-2);
    }
    .worksheet-subtitle {
      font-size: var(--t-lede);
      color: var(--ink-2);
      margin: 0 0 var(--s-6);
    }
    .items-grid {
      display: flex;
      flex-direction: column;
      gap: var(--s-4);
    }
    .worksheet-item {
      background: var(--paper);
      border: 1px solid var(--rule-strong);
      border-radius: var(--r-md);
      padding: var(--s-4);
      transition: all var(--dur-fast) ease;
    }
    .worksheet-item.checked {
      background: var(--accent-soft);
      border-color: var(--accent);
    }
    .item-header {
      display: flex;
      align-items: center;
      gap: var(--s-3);
      margin-bottom: var(--s-2);
    }
    .item-num {
      font-size: var(--t-xs);
      font-weight: 800;
      color: var(--accent-ink);
      background: var(--surface);
      border: 1px solid var(--rule-strong);
      padding: 2px 8px;
      border-radius: var(--r-sm);
    }
    .item-title {
      font-size: var(--t-body);
      font-weight: 800;
      color: var(--ink);
      margin: 0;
      flex: 1;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-label input {
      display: none;
    }
    .custom-box {
      width: 20px;
      height: 20px;
      border: 2px solid var(--rule-strong);
      border-radius: var(--r-sm);
      background: var(--surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-ink);
      transition: all var(--dur-fast) ease;
    }
    .worksheet-item.checked .custom-box {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--on-accent);
    }
    .check-text {
      font-size: var(--t-xs);
      font-weight: 700;
      color: var(--ink-2);
    }
    .item-text {
      font-size: var(--t-sm);
      color: var(--ink-2);
      margin: 0;
      line-height: var(--lh-body);
    }
    .worksheet-outcome {
      display: flex;
      align-items: flex-start;
      gap: var(--s-3);
      margin-top: var(--s-6);
      padding-top: var(--s-4);
      border-top: 1px dashed var(--rule-strong);
      color: var(--accent-ink);
    }
    .worksheet-outcome p {
      font-size: var(--t-sm);
      font-weight: 700;
      margin: 0;
      line-height: var(--lh-body);
      color: var(--ink);
    }
  `]
})
export class BlogStudentWorksheetComponent {
  @Input({ required: true }) heading!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) items: StudentExerciseItem[] = [];
  @Input() outcome?: string;

  checkedState: boolean[] = [];

  toggleCheck(index: number): void {
    this.checkedState[index] = !this.checkedState[index];
  }
}
