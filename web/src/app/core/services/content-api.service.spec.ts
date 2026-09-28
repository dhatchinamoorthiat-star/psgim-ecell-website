import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContentApiService } from './content-api.service';

describe('ContentApiService', () => {
  let service: ContentApiService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentApiService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('fetches a published page by content type and slug', async () => {
    const promise = service.getPage('page', 'home');
    const req = backend.expectOne('/api/v1/content/public/page/home');
    expect(req.request.method).toBe('GET');
    req.flush({
      content_type: 'page',
      slug: 'home',
      blocks: { schema_version: 1, blocks: [] },
      seo: {},
      published_at: 'x',
    });
    await expect(promise).resolves.toMatchObject({ slug: 'home' });
  });

  it('calls the allowlisted dynamic-query endpoint with the identifier and options', async () => {
    const promise = service.getDynamic('published_events_upcoming', {
      sort: 'starts_at_asc',
      limit: 3,
    });
    const req = backend.expectOne(
      (r) =>
        r.url === '/api/v1/content/public/dynamic/published_events_upcoming' &&
        r.params.get('sort') === 'starts_at_asc' &&
        r.params.get('limit') === '3',
    );
    req.flush({ query: 'published_events_upcoming', sort: 'starts_at_asc', count: 0, results: [] });
    await expect(promise).resolves.toMatchObject({ query: 'published_events_upcoming' });
  });

  it('never constructs a query outside the identifier the caller passed (no client-built filter/SQL)', async () => {
    const promise = service.getDynamic('published_blogs');
    const req = backend.expectOne('/api/v1/content/public/dynamic/published_blogs');
    expect(req.request.params.keys().length).toBe(0); // no sort/limit supplied -> no extra params sent
    req.flush({ query: 'published_blogs', sort: 'published_at_desc', count: 0, results: [] });
    await promise;
  });
});
