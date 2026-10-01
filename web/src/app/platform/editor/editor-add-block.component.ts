import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, viewChild } from '@angular/core';
import { ContentBlockTypeDef } from './editor.types';

/**
 * The "Add block" palette (task §10). Only ever lists block types actually
 * present in `ContentBlockType` (fetched from the backend, the canonical
 * registry) — there is no client-side list of block types anywhere in the
 * editor, so a new block type becoming available server-side shows up here
 * automatically, and nothing here can offer a type the backend wouldn't
 * accept.
 */
@Component({
  selector: 'app-editor-add-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dlg class="pf-dialog be-add-block-dialog" (close)="closed.emit()">
      <h2>Add block</h2>
      <p class="pf-muted">Choose a block type from the design system.</p>
      <ul class="be-block-palette">
        @for (bt of blockTypes; track bt.key) {
          <li>
            <button type="button" class="be-block-palette-item" (click)="choose(bt.key)">
              <strong>{{ bt.label }}</strong>
              <span class="pf-muted">{{ bt.key }}</span>
            </button>
          </li>
        }
      </ul>
      <div class="pf-dialog-actions">
        <button type="button" class="pf-btn" (click)="close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class EditorAddBlockComponent {
  @Input({ required: true }) blockTypes: ContentBlockTypeDef[] = [];
  @Output() pick = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  open(): void {
    this.dlg().nativeElement.showModal();
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  choose(key: string): void {
    this.pick.emit(key);
    this.close();
  }
}
