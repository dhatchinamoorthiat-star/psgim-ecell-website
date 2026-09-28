import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, Input, isDevMode } from '@angular/core';
import { BLOCK_REGISTRY } from './block-registry';
import { BlockNode } from './block.types';

/**
 * The canonical renderer (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Shared
 * renderer invariant"): `ContentDocument.blocks -> BlockRenderer ->
 * BlockComponentRegistry -> Angular component`. Used identically by the
 * public site (`CmsPageComponent`) and, from Phase 2C on, the visual
 * editor's preview — both must render from exactly this component, never
 * a parallel implementation.
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
 */
@Component({
  selector: 'block-renderer',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  template: `
    @for (block of blocks; track block.id) {
      @if (componentFor(block.type); as cmp) {
        <ng-container
          *ngComponentOutlet="cmp; inputs: { props: block.props, blockId: block.id }"
        ></ng-container>
      } @else {
        @if (devMode) {
          <!-- Unknown block type — rendered as nothing in production, logged once here in dev only. -->
        }
      }
    }
  `,
})
export class BlockRendererComponent {
  @Input({ required: true }) blocks: BlockNode[] = [];

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
