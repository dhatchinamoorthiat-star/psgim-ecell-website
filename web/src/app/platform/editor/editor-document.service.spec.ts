import { EditorDocumentService, defaultPropsFor } from './editor-document.service';
import { BlockNode } from '../../shared/blocks/block.types';

function block(id: string, type = 'hero', props: Record<string, unknown> = {}): BlockNode {
  return { id, type, props };
}

describe('EditorDocumentService', () => {
  let svc: EditorDocumentService;

  beforeEach(() => {
    svc = new EditorDocumentService();
    svc.load([block('a'), block('b'), block('c')]);
  });

  // --- document state -------------------------------------------------

  it('adds a block after the given id, and selects it', () => {
    svc.addBlock('cta', { label: 'Join', url: '/contact/' }, 'a');
    const ids = svc.blocks().map((b) => b.id);
    expect(ids[1]).not.toBe('b'); // new block inserted right after 'a'
    expect(svc.blocks()[1].type).toBe('cta');
    expect(svc.selectedId()).toBe(svc.blocks()[1].id);
  });

  it('adds a block at the end when no afterId is given', () => {
    svc.addBlock('cta', {}, null);
    expect(svc.blocks().at(-1)!.type).toBe('cta');
  });

  it('duplicates a block with a new stable id, preserving props, and selects the copy', () => {
    svc.updateBlockProps('a', { heading: 'Original' });
    svc.duplicateBlock('a');
    const [orig, copy] = svc.blocks();
    expect(copy.id).not.toBe(orig.id);
    expect(copy.props).toEqual(orig.props);
    expect(svc.selectedId()).toBe(copy.id);
  });

  it('deletes a block and clears selection if it was selected', () => {
    svc.select('b');
    svc.deleteBlock('b');
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'c']);
    expect(svc.selectedId()).toBeNull();
  });

  it('moves a block up and down by one position', () => {
    svc.moveBlock('b', -1);
    expect(svc.blocks().map((b) => b.id)).toEqual(['b', 'a', 'c']);
    svc.moveBlock('b', 1);
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not move a block past the start or end', () => {
    svc.moveBlock('a', -1);
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'b', 'c']);
    svc.moveBlock('c', 1);
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('reorders via drag-and-drop indices', () => {
    svc.reorder(0, 2);
    expect(svc.blocks().map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('edits a prop, including nested prop merges without clobbering siblings', () => {
    svc.updateBlockProps('a', { heading: 'H1' });
    svc.updateBlockProps('a', { description: 'D1' });
    expect(svc.blocks()[0].props).toEqual({ heading: 'H1', description: 'D1' });
  });

  // --- selection --------------------------------------------------------

  it('selection persists across unrelated document edits', () => {
    svc.select('b');
    svc.updateBlockProps('a', { heading: 'X' });
    expect(svc.selectedId()).toBe('b');
  });

  it('hover state is independent of selection', () => {
    svc.select('a');
    svc.hover('c');
    expect(svc.selectedId()).toBe('a');
    expect(svc.hoveredId()).toBe('c');
  });

  it('selectedBlock() resolves the actual block object for the current selection', () => {
    svc.select('b');
    expect(svc.selectedBlock()?.id).toBe('b');
    svc.deleteBlock('b');
    expect(svc.selectedBlock()).toBeNull();
  });

  // --- undo / redo --------------------------------------------------------

  it('undoes and redoes a prop edit', () => {
    svc.updateBlockProps('a', { heading: 'Changed' });
    expect(svc.blocks()[0].props['heading']).toBe('Changed');
    svc.undo();
    expect(svc.blocks()[0].props['heading']).toBeUndefined();
    svc.redo();
    expect(svc.blocks()[0].props['heading']).toBe('Changed');
  });

  it('undoes a block add', () => {
    svc.addBlock('cta', {}, null);
    expect(svc.blocks().length).toBe(4);
    svc.undo();
    expect(svc.blocks().length).toBe(3);
  });

  it('undoes a block delete (the block reappears)', () => {
    svc.deleteBlock('b');
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'c']);
    svc.undo();
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('undoes a reorder', () => {
    svc.reorder(0, 2);
    svc.undo();
    expect(svc.blocks().map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('a new edit after undo clears the redo stack', () => {
    svc.updateBlockProps('a', { heading: 'One' });
    svc.undo();
    svc.updateBlockProps('a', { heading: 'Two' });
    expect(svc.canRedo()).toBe(false);
  });

  it('canUndo/canRedo reflect stack state', () => {
    expect(svc.canUndo()).toBe(false);
    svc.updateBlockProps('a', { heading: 'X' });
    expect(svc.canUndo()).toBe(true);
    svc.undo();
    expect(svc.canUndo()).toBe(false);
    expect(svc.canRedo()).toBe(true);
  });

  // --- dirty tracking / load / markSaved --------------------------------

  it('is not dirty immediately after load', () => {
    expect(svc.isDirty()).toBe(false);
  });

  it('becomes dirty after an edit, and clean again after markSaved', () => {
    svc.updateBlockProps('a', { heading: 'X' });
    expect(svc.isDirty()).toBe(true);
    svc.markSaved();
    expect(svc.isDirty()).toBe(false);
  });

  it('markSaved does not clear undo history', () => {
    svc.updateBlockProps('a', { heading: 'X' });
    svc.markSaved();
    expect(svc.canUndo()).toBe(true);
  });

  it('load() resets history and selection', () => {
    svc.select('a');
    svc.updateBlockProps('a', { heading: 'X' });
    svc.load([block('z')]);
    expect(svc.blocks().map((b) => b.id)).toEqual(['z']);
    expect(svc.selectedId()).toBeNull();
    expect(svc.canUndo()).toBe(false);
    expect(svc.isDirty()).toBe(false);
  });

  it('toDocument() wraps the current blocks in a schema_version envelope', () => {
    expect(svc.toDocument()).toEqual({ schema_version: 1, blocks: svc.blocks() });
  });

  // --- conflict resolution ------------------------------------------------

  it('restoreLocalOverBaseline keeps the local blocks but is dirty against the new server baseline', () => {
    // This is the exact bug a live manual test caught: naively calling
    // load(localSnapshot) after a conflict makes isDirty() false (baseline
    // becomes the same as blocks), so the retried save silently no-ops.
    const serverLatest = [
      block('a', 'hero', { heading: 'Someone else’s change' }),
      block('b'),
      block('c'),
    ];
    const myLocalEdit = [block('a', 'hero', { heading: 'My local edit' }), block('b'), block('c')];
    svc.restoreLocalOverBaseline(serverLatest, myLocalEdit);
    expect(svc.blocks()).toEqual(myLocalEdit);
    expect(svc.isDirty()).toBe(true);
  });
});

describe('defaultPropsFor', () => {
  it('fills only required fields with type-appropriate safe defaults', () => {
    const defaults = defaultPropsFor({
      heading: { type: 'string', required: true },
      description: { type: 'string', required: false },
      count: { type: 'int', required: true },
      flag: { type: 'bool', required: true },
      items: { type: 'list', required: true },
      link: { type: 'url', required: true },
      image: { type: 'image', required: false },
    });
    expect(defaults).toEqual({ heading: '', count: 0, flag: false, items: [], link: '/' });
    expect('description' in defaults).toBe(false);
    expect('image' in defaults).toBe(false);
  });

  it('recurses into required object props', () => {
    const defaults = defaultPropsFor({
      featured: {
        type: 'object',
        required: true,
        properties: { title: { type: 'string', required: true } },
      },
    });
    expect(defaults).toEqual({ featured: { title: '' } });
  });
});
