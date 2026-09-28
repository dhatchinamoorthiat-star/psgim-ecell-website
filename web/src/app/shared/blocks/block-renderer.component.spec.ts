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
});
