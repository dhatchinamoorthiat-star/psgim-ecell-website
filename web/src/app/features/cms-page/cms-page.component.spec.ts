import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { CmsPageComponent } from './cms-page.component';

describe('CmsPageComponent', () => {
  let backend: HttpTestingController;

  function create(contentType: string, slug: string) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CmsPageComponent);
    fixture.componentRef.setInput('contentType', contentType);
    fixture.componentRef.setInput('slug', slug);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => backend.verify());

  it('renders the published document through the shared block renderer', async () => {
    const { fixture, el } = create('page', 'home');
    const req = backend.expectOne('/api/v1/content/public/page/home');
    req.flush({
      content_type: 'page',
      slug: 'home',
      blocks: {
        schema_version: 1,
        blocks: [{ id: 'h1', type: 'hero', props: { heading: 'Innovate To Elevate' } }],
      },
      seo: { title: 'Home', description: 'd', path: '/' },
      published_at: 'x',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent).toBe('Innovate To Elevate');
  });

  it('shows a not-found state instead of any content when nothing is published', async () => {
    const { fixture, el } = create('page', 'unpublished-slug');
    const req = backend.expectOne('/api/v1/content/public/page/unpublished-slug');
    req.flush({ detail: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Not found');
    expect(el.querySelector('block-renderer')).toBeNull();
  });
});
