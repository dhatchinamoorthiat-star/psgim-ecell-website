import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BlockNode } from '../../shared/blocks/block.types';

/**
 * The layer/outline panel (task §6). Selecting a layer selects the
 * corresponding canvas block and vice versa — both read/write the same
 * `EditorDocumentService.selectedId`/`hoveredId` signals via the parent,
 * so there is exactly one selection model, never two that could drift.
 */
@Component({
  selector: 'app-editor-layers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="be-layers" aria-label="Page structure">
      <h2 class="pf-nav-label">Structure</h2>
      @if (blocks.length === 0) {
        <p class="pf-muted be-empty">No blocks yet. Use "Add block" to start.</p>
      }
      <ul class="be-layers-list">
        @for (block of blocks; track block.id; let i = $index) {
          <li>
            <button
              type="button"
              class="be-layer-item"
              [class.is-selected]="selectedId === block.id"
              [class.is-hovered]="hoveredId === block.id"
              (click)="select.emit(block.id)"
              (mouseenter)="hover.emit(block.id)"
              (mouseleave)="hover.emit(null)"
              [attr.aria-current]="selectedId === block.id"
            >
              <span class="be-layer-index">{{ i + 1 }}</span>
              <span class="be-layer-type">{{ block.type }}</span>
              <span class="be-layer-heading">{{ headingOf(block) }}</span>
            </button>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class EditorLayersComponent {
  @Input({ required: true }) blocks: BlockNode[] = [];
  @Input() selectedId: string | null = null;
  @Input() hoveredId: string | null = null;

  @Output() select = new EventEmitter<string>();
  @Output() hover = new EventEmitter<string | null>();

  headingOf(block: BlockNode): string {
    const props = block.props as Record<string, unknown>;
    const label = props['heading'] ?? props['label'] ?? props['title'];
    return typeof label === 'string' && label ? label : '';
  }
}
