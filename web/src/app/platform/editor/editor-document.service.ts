import { Injectable, computed, signal } from '@angular/core';
import { BlockNode } from '../../shared/blocks/block.types';
import { PropSpec } from './editor.types';

const MAX_HISTORY = 50;

function newBlockId(): string {
  // Stable once assigned — never regenerated on re-render, only at
  // creation/duplication (task §4: "IDs survive reorder/duplication/
  // autosave", "not random IDs that change every render").
  return `block_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/** Builds schema-valid, empty-but-safe default props for a newly inserted
 * block (task §10: "safe default props"). Only required props need a
 * value — every block schema allows an empty list/optional prop otherwise. */
export function defaultPropsFor(props: Record<string, PropSpec>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(props)) {
    if (!spec.required) continue;
    switch (spec.type) {
      case 'string':
        out[name] = spec.enum?.[0] ?? '';
        break;
      case 'url':
        out[name] = '/';
        break;
      case 'int':
        out[name] = 0;
        break;
      case 'bool':
        out[name] = false;
        break;
      case 'list':
        out[name] = [];
        break;
      case 'object':
        out[name] = defaultPropsFor(spec.properties ?? {});
        break;
      case 'image':
        out[name] = null;
        break;
    }
  }
  return out;
}

/**
 * The editor's document state (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
 * "Editor document state model"). Scoped per editor route instance
 * (provided by `EditorPageComponent`, not `providedIn: 'root'`) so two
 * open editor tabs never share state.
 *
 * History is bounded immutable snapshots of the whole `blocks` array
 * (task §16: "store document-state patches or immutable document
 * snapshots... use a bounded history"). Not DOM snapshots, not a diff/patch
 * format — plain deep-cloned JSON, which is cheap at this document size
 * and trivial to reason about correctly under time pressure.
 */
@Injectable()
export class EditorDocumentService {
  private readonly _blocks = signal<BlockNode[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _hoveredId = signal<string | null>(null);
  private readonly _undoStack = signal<BlockNode[][]>([]);
  private readonly _redoStack = signal<BlockNode[][]>([]);
  private readonly _baselineBlocks = signal<BlockNode[]>([]); // last-saved state, for dirty comparison

  readonly blocks = this._blocks.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hoveredId = this._hoveredId.asReadonly();
  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);
  readonly isDirty = computed(
    () => JSON.stringify(this._blocks()) !== JSON.stringify(this._baselineBlocks()),
  );
  readonly selectedBlock = computed(
    () => this._blocks().find((b) => b.id === this._selectedId()) ?? null,
  );

  /** Loads a freshly-fetched document, resetting history and the dirty baseline. */
  load(blocks: BlockNode[]): void {
    this._blocks.set(structuredClone(blocks));
    this._baselineBlocks.set(structuredClone(blocks));
    this._undoStack.set([]);
    this._redoStack.set([]);
    this._selectedId.set(null);
    this._hoveredId.set(null);
  }

  /**
   * Conflict resolution's "keep my changes" path (task §18): the server's
   * latest saved content becomes the new baseline, but the working blocks
   * stay the user's local edits — deliberately `isDirty() === true` right
   * after this call, so the follow-up save actually sends a PATCH instead
   * of `load()`'s ordinary behavior of treating the loaded content as
   * already clean.
   */
  restoreLocalOverBaseline(serverBaseline: BlockNode[], localBlocks: BlockNode[]): void {
    this._baselineBlocks.set(structuredClone(serverBaseline));
    this._blocks.set(structuredClone(localBlocks));
  }

  /** Called after a successful server save — the current state becomes the
   * new "clean" baseline without touching undo/redo history. */
  markSaved(): void {
    this._baselineBlocks.set(structuredClone(this._blocks()));
  }

  select(id: string | null): void {
    this._selectedId.set(id);
  }

  hover(id: string | null): void {
    this._hoveredId.set(id);
  }

  private commit(next: BlockNode[]): void {
    this._undoStack.update((s) => [
      ...s.slice(-(MAX_HISTORY - 1)),
      structuredClone(this._blocks()),
    ]);
    this._redoStack.set([]);
    this._blocks.set(next);
  }

  undo(): void {
    const stack = this._undoStack();
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    this._redoStack.update((s) => [...s, structuredClone(this._blocks())]);
    this._undoStack.set(stack.slice(0, -1));
    this._blocks.set(previous);
  }

  redo(): void {
    const stack = this._redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    this._undoStack.update((s) => [...s, structuredClone(this._blocks())]);
    this._redoStack.set(stack.slice(0, -1));
    this._blocks.set(next);
  }

  updateBlockProps(id: string, props: Record<string, unknown>): void {
    const next = this._blocks().map((b) =>
      b.id === id ? { ...b, props: { ...b.props, ...props } } : b,
    );
    this.commit(next);
  }

  addBlock(type: string, defaultProps: Record<string, unknown>, afterId: string | null): void {
    const block: BlockNode = { id: newBlockId(), type, props: defaultProps };
    const list = this._blocks();
    const index = afterId ? list.findIndex((b) => b.id === afterId) : list.length - 1;
    const insertAt = index === -1 ? list.length : index + 1;
    const next = [...list.slice(0, insertAt), block, ...list.slice(insertAt)];
    this.commit(next);
    this._selectedId.set(block.id);
  }

  duplicateBlock(id: string): void {
    const list = this._blocks();
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) return;
    const copy: BlockNode = { ...structuredClone(list[index]), id: newBlockId() };
    const next = [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
    this.commit(next);
    this._selectedId.set(copy.id);
  }

  deleteBlock(id: string): void {
    const next = this._blocks().filter((b) => b.id !== id);
    this.commit(next);
    if (this._selectedId() === id) this._selectedId.set(null);
  }

  /** Moves a block up (-1) or down (+1) by one position. */
  moveBlock(id: string, direction: -1 | 1): void {
    const list = this._blocks();
    const index = list.findIndex((b) => b.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    this.commit(next);
  }

  /** Drag-and-drop reorder: move the block at `fromIndex` to `toIndex`. */
  reorder(fromIndex: number, toIndex: number): void {
    const list = [...this._blocks()];
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.commit(list);
  }

  toDocument(): { schema_version: number; blocks: BlockNode[] } {
    return { schema_version: 1, blocks: this._blocks() };
  }
}
