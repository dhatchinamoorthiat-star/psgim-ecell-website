import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { BlockRendererComponent } from './block-renderer.component';
import { BlockNode } from './block.types';

describe('BlockRendererComponent', () => {
  function render(blocks: BlockNode[]) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(BlockRendererComponent);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders a known block type with its props passed through', () => {
    const { el } = render([
      { id: 'h1', type: 'hero', props: { heading: 'Hello world', description: 'A description.' } },
    ]);
    expect(el.querySelector('h1')?.textContent).toBe('Hello world');
    expect(el.textContent).toContain('A description.');
  });

  it('renders nothing for an unregistered block type, without throwing', () => {
    let el!: HTMLElement;
    expect(() => {
      el = render([{ id: 'x1', type: 'not_a_real_block', props: {} }]).el;
    }).not.toThrow();
    expect(el.textContent?.trim()).toBe('');
  });

  it('renders multiple registered blocks in document order', () => {
    const { el } = render([
      { id: 'h1', type: 'hero', props: { heading: 'First' } },
      { id: 'c1', type: 'cta', props: { label: 'Join', url: '/contact/' } },
    ]);
    const heading = el.querySelector('h1');
    const cta = el.querySelector('a.btn-primary');
    expect(heading?.textContent).toBe('First');
    expect(cta?.textContent?.trim()).toBe('Join');
    // Document order preserved in the DOM.
    expect(heading!.compareDocumentPosition(cta!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('interpolates malicious-looking text content instead of executing it as HTML', () => {
    const { el } = render([
      {
        id: 'r1',
        type: 'rich_text',
        props: { paragraphs: ['<img src=x onerror=alert(1)>', '<script>alert(2)</script>'] },
      },
    ]);
    // No actual <script>/<img onerror> elements were created from block content.
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('img[onerror]')).toBeNull();
    // The literal text is still present, escaped, as ordinary rendered text.
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.textContent).toContain('<script>alert(2)</script>');
  });

  it('renders nested structured props (object_list) correctly, not flattened to strings', () => {
    const { el } = render([
      {
        id: 's1',
        type: 'stats',
        props: { items: [{ value: '23', label: 'Active members', count: 23 }] },
      },
    ]);
    expect(el.textContent).toContain('Active members');
  });

  it('renders card_grid cards with title and body from structured objects', () => {
    const { el } = render([
      {
        id: 'cg1',
        type: 'card_grid',
        props: { cards: [{ title: 'Build', body: 'Turn an idea into something real.' }] },
      },
    ]);
    expect(el.querySelector('h3')?.textContent).toBe('Build');
    expect(el.textContent).toContain('Turn an idea into something real.');
  });

  // --- editorHost (Phase 2C) --------------------------------------------

  function renderWithHost(
    blocks: BlockNode[],
    host: Partial<import('./block-editor-host').BlockEditorHost>,
  ) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(BlockRendererComponent);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.componentRef.setInput('editorHost', host);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('adds no editor chrome at all when editorHost is absent (public rendering)', () => {
    const { el } = render([{ id: 'h1', type: 'hero', props: { heading: 'Hi' } }]);
    expect(el.querySelector('.be-block')).toBeNull();
  });

  it('wraps each block and reflects selected/hovered state via the editorHost', () => {
    const { el } = renderWithHost(
      [
        { id: 'h1', type: 'hero', props: { heading: 'One' } },
        { id: 'h2', type: 'hero', props: { heading: 'Two' } },
      ],
      { selectedId: () => 'h1', hoveredId: () => 'h2', select: () => {}, hover: () => {} },
    );
    const wraps = el.querySelectorAll('.be-block');
    expect(wraps.length).toBe(2);
    expect(wraps[0].classList.contains('is-selected')).toBe(true);
    expect(wraps[1].classList.contains('is-hovered')).toBe(true);
  });

  it('clicking a block calls editorHost.select with its id', () => {
    const selected: string[] = [];
    const { el } = renderWithHost([{ id: 'h1', type: 'hero', props: { heading: 'Hi' } }], {
      selectedId: () => null,
      hoveredId: () => null,
      select: (id) => selected.push(id),
      hover: () => {},
    });
    (el.querySelector('.be-block') as HTMLElement).click();
    expect(selected).toEqual(['h1']);
  });

  it('only shows duplicate/delete/move actions when the host provides them, and only for the selected block', () => {
    const calls: string[] = [];
    const { el } = renderWithHost([{ id: 'h1', type: 'hero', props: { heading: 'Hi' } }], {
      selectedId: () => 'h1',
      hoveredId: () => null,
      select: () => {},
      hover: () => {},
      duplicate: (id) => calls.push('dup:' + id),
      remove: (id) => calls.push('del:' + id),
    });
    const buttons = [...el.querySelectorAll('.be-block-actions button')];
    expect(buttons.length).toBe(2); // duplicate + delete only — no moveUp/moveDown provided
    (
      buttons.find((b) => b.getAttribute('aria-label') === 'Duplicate block') as HTMLElement
    ).click();
    (buttons.find((b) => b.getAttribute('aria-label') === 'Delete block') as HTMLElement).click();
    expect(calls).toEqual(['dup:h1', 'del:h1']);
  });
});
