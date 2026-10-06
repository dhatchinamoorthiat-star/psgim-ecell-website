import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { BlockEditorHost } from '../../shared/blocks/block-editor-host';
import { BlockRendererComponent } from '../../shared/blocks/block-renderer.component';
import { EditorDocumentService } from './editor-document.service';
import { ViewportSize } from './editor-toolbar.component';

const VIEWPORT_WIDTH: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '48rem',
  mobile: '24rem',
};

/**
 * The canvas: the actual page, rendered through the exact same
 * `BlockRendererComponent` the public site uses, with the editor's
 * selection/hover/duplicate/delete/move actions wired in via
 * `BlockEditorHost` (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Canvas").
 * `EDITOR OVERLAY ≠ PUBLIC CONTENT`: the overlay classes/buttons exist only
 * because `editorHost` is passed here — `CmsPageComponent` never passes one.
 */
@Component({
  selector: 'app-editor-canvas',
  standalone: true,
  imports: [CommonModule, BlockRendererComponent],
  template: `
    <div class="be-canvas-scroll">
      <div class="be-canvas-frame" [style.width]="frameWidth()" (click)="doc.select(null)">
        <block-renderer [blocks]="doc.blocks()" [editorHost]="host" />
      </div>
    </div>
  `,
})
export class EditorCanvasComponent {
  @Input() viewport: ViewportSize = 'desktop';
  /** Mirrors `EditorPageComponent.onPropsChange` (the side panel's path) so
   * inline canvas edits go through the same autosave scheduling instead of
   * only mutating the document. */
  @Output() propChange = new EventEmitter<{ id: string; key: string; value: unknown }>();

  doc = inject(EditorDocumentService);

  readonly host: BlockEditorHost = {
    selectedId: () => this.doc.selectedId(),
    hoveredId: () => this.doc.hoveredId(),
    select: (id) => this.doc.select(id),
    hover: (id) => this.doc.hover(id),
    duplicate: (id) => this.doc.duplicateBlock(id),
    remove: (id) => this.doc.deleteBlock(id),
    moveUp: (id) => this.doc.moveBlock(id, -1),
    moveDown: (id) => this.doc.moveBlock(id, 1),
    updateProp: (id, key, value) => this.propChange.emit({ id, key, value }),
  };

  frameWidth(): string {
    return VIEWPORT_WIDTH[this.viewport];
  }
}
