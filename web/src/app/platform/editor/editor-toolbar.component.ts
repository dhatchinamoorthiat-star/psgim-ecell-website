import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SaveStatus } from './editor.types';
import { WORKFLOW_STATE_LABELS, WorkflowState } from '../approvals/approvals.types';

export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="be-toolbar" role="toolbar" aria-label="Editor actions">
      <div class="be-toolbar-group">
        <strong>{{ title }}</strong>
        <span
          class="pf-chip"
          [class.pf-chip-ok]="saveStatus === 'saved'"
          [class.pf-chip-warn]="saveStatus === 'dirty' || saveStatus === 'saving'"
          [class.pf-chip-accent]="saveStatus === 'conflict' || saveStatus === 'error'"
        >
          {{ statusLabel() }}
        </span>
        @if (workflowState) {
          <span class="pf-chip pf-chip-accent">{{ workflowStateLabel() }}</span>
        }
      </div>
      <div class="be-toolbar-group" role="group" aria-label="History">
        <button
          type="button"
          class="pf-btn pf-btn-sm"
          [disabled]="!canUndo"
          (click)="undo.emit()"
          aria-keyshortcuts="Control+Z"
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          class="pf-btn pf-btn-sm"
          [disabled]="!canRedo"
          (click)="redo.emit()"
          aria-keyshortcuts="Control+Shift+Z"
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          Redo
        </button>
      </div>
      <div class="be-toolbar-group" role="group" aria-label="Viewport preview size">
        @for (size of viewports; track size) {
          <button
            type="button"
            class="pf-btn pf-btn-sm"
            [class.pf-btn-primary]="viewport === size"
            (click)="viewportChange.emit(size)"
            [attr.aria-pressed]="viewport === size"
          >
            {{ label(size) }}
          </button>
        }
      </div>
      <div class="be-toolbar-group">
        <button type="button" class="pf-btn pf-btn-sm" (click)="togglePreview.emit()">
          {{ previewing ? 'Exit preview' : 'Preview' }}
        </button>
        <button
          type="button"
          class="pf-btn pf-btn-primary pf-btn-sm"
          [disabled]="saveStatus === 'saving'"
          (click)="save.emit()"
        >
          {{ saveStatus === 'saving' ? 'Saving…' : 'Save draft' }}
        </button>
        @if (canSubmit) {
          <button
            type="button"
            class="pf-btn pf-btn-primary pf-btn-sm"
            [disabled]="saveStatus === 'saving' || submitting"
            (click)="submitForReview.emit()"
          >
            {{ submitting ? 'Submitting…' : 'Submit for review' }}
          </button>
        }
        @if (versionId) {
          <a class="pf-btn pf-btn-sm" [routerLink]="['/platform/approvals', versionId]"
            >Approval history</a
          >
        }
      </div>
    </div>
  `,
})
export class EditorToolbarComponent {
  @Input() title = '';
  @Input() saveStatus: SaveStatus = 'idle';
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() viewport: ViewportSize = 'desktop';
  @Input() previewing = false;
  /** DRAFT/CHANGES_REQUESTED only — every other state is immutable or already
   * past the "not yet submitted" point (see workflow.py transition rules). */
  @Input() workflowState: string | null = null;
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Input() versionId: string | null = null;

  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() viewportChange = new EventEmitter<ViewportSize>();
  @Output() togglePreview = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() submitForReview = new EventEmitter<void>();

  readonly viewports: ViewportSize[] = ['desktop', 'tablet', 'mobile'];

  label(size: ViewportSize): string {
    return size[0].toUpperCase() + size.slice(1);
  }

  workflowStateLabel(): string {
    if (!this.workflowState) return '';
    return WORKFLOW_STATE_LABELS[this.workflowState as WorkflowState] ?? this.workflowState;
  }

  statusLabel(): string {
    switch (this.saveStatus) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'dirty':
        return 'Unsaved changes';
      case 'error':
        return 'Save failed';
      case 'conflict':
        return 'Changed elsewhere';
      default:
        return 'Draft';
    }
  }
}
