import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, Input, isDevMode } from '@angular/core';
import { BlockEditorHost } from './block-editor-host';
import { BLOCK_REGISTRY } from './block-registry';
import { BlockNode } from './block.types';

/**
 * The canonical renderer (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Shared
 * renderer invariant"): `ContentDocument.blocks -> BlockRenderer ->
 * BlockComponentRegistry -> Angular component`. Used identically by the
 * public site (`CmsPageComponent`) and the Phase 2C visual editor's canvas
 * (`EditorCanvasComponent`) — both render from exactly this component,
 * never a parallel implementation.
 *
 * Safety: `block.type` is only ever used as a `Map.get` key into a
 * statically-imported registry (`BLOCK_REGISTRY`) — an unregistered type
 * renders nothing (logged once in dev, silent in production; this is the
 * "reject unknown block types gracefully" requirement). `block.props` is
 * passed straight through to the resolved component's `@Input() props`
 * without interpretation here — every component that receives it declares
 * its own narrow prop interface and binds fields into the template with
 * ordinary Angular interpolation, never `[innerHTML]`. There is no
 * `eval`, `Function(...)`, or dynamic template compilation anywhere in
 * this file or any block component.
 *
 * `editorHost` (optional, undefined on every public render) is the only
 * concession to editor interaction: when present, each top-level block is
 * wrapped in a selectable/hoverable container; when absent, the template
 * renders the bare `ngComponentOutlet` with no extra DOM at all.
 */
@Component({
  selector: 'block-renderer',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  template: `
    @for (block of blocks; track block.id) {
      @if (componentFor(block.type); as cmp) {
        @if (editorHost) {
          <div
            class="be-block"
            [class.is-selected]="editorHost.selectedId() === block.id"
            [class.is-hovered]="editorHost.hoveredId() === block.id"
            [attr.data-block-id]="block.id"
            [attr.aria-label]="block.type + ' block'"
            tabindex="0"
            (click)="editorHost.select(block.id); $event.stopPropagation()"
            (keydown.enter)="editorHost.select(block.id); $event.stopPropagation()"
            (mouseenter)="editorHost.hover(block.id)"
            (mouseleave)="editorHost.hover(null)"
          >
            <div class="be-block-chrome">
              <span class="be-block-label">{{ block.type }}</span>
              @if (editorHost.selectedId() === block.id) {
                <span
                  class="be-block-actions"
                  role="group"
                  [attr.aria-label]="'Actions for ' + block.type + ' block'"
                >
                  @if (editorHost.moveUp) {
                    <button
                      type="button"
                      class="be-icon-btn"
                      (click)="editorHost.moveUp(block.id); $event.stopPropagation()"
                      title="Move up"
                      aria-label="Move block up"
                    >
                      ↑
                    </button>
                  }
                  @if (editorHost.moveDown) {
                    <button
                      type="button"
                      class="be-icon-btn"
                      (click)="editorHost.moveDown(block.id); $event.stopPropagation()"
                      title="Move down"
                      aria-label="Move block down"
                    >
                      ↓
                    </button>
                  }
                  @if (editorHost.duplicate) {
                    <button
                      type="button"
                      class="be-icon-btn"
                      (click)="editorHost.duplicate(block.id); $event.stopPropagation()"
                      title="Duplicate"
                      aria-label="Duplicate block"
                    >
                      ⧉
                    </button>
                  }
                  @if (editorHost.remove) {
                    <button
                      type="button"
                      class="be-icon-btn be-icon-btn-danger"
                      (click)="editorHost.remove(block.id); $event.stopPropagation()"
                      title="Delete"
                      aria-label="Delete block"
                    >
                      ✕
                    </button>
                  }
                </span>
              }
            </div>
            <ng-container *ngTemplateOutlet="outlet; context: { $implicit: { cmp, block } }" />
          </div>
        } @else {
          <ng-container *ngTemplateOutlet="outlet; context: { $implicit: { cmp, block } }" />
        }
      } @else {
        @if (devMode) {
          <!-- Unknown block type — rendered as nothing in production, logged once here in dev only. -->
        }
      }
    }

    <ng-template #outlet let-ctx>
      <ng-container
        *ngComponentOutlet="ctx.cmp; inputs: { props: ctx.block.props, blockId: ctx.block.id }"
      ></ng-container>
    </ng-template>
  `,
})
export class BlockRendererComponent {
  @Input({ required: true }) blocks: BlockNode[] = [];
  @Input() editorHost: BlockEditorHost | null = null;

  readonly devMode = isDevMode();
  private warned = new Set<string>();

  componentFor(type: string) {
    const cmp = BLOCK_REGISTRY.get(type);
    if (!cmp && this.devMode && !this.warned.has(type)) {
      this.warned.add(type);
      // eslint-disable-next-line no-console
      console.warn(
        `[block-renderer] no component registered for block type "${type}" — rendering nothing.`,
      );
    }
    return cmp ?? null;
  }
}
