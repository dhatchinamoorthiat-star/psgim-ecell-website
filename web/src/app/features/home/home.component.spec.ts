import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

const UPCOMING = '/api/v1/content/public/dynamic/published_events_upcoming';
const PAST = '/api/v1/content/public/dynamic/published_events_past';

function page(query: string, results: unknown[]) {
  return { query, sort: 'starts_at_asc', count: results.length, results };
}

/** Test-only fixture row — shaped like the API, never shipped. */
function ev(slug: string, title: string) {
  return {
    slug,
    title,
    starts_at: '2000-01-01T10:00:00Z',
    ends_at: null,
    speakers: [],
    gallery: [],
    pending: false,
  };
}

describe('HomeComponent event teaser', () => {
  let backend: HttpTestingController;

  // jsdom here lacks these browser APIs; the homepage's theme, boot and motion code need them.
  beforeAll(() => {
    if (!('IntersectionObserver' in globalThis)) {
      (globalThis as any).IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      };
    }
    for (const key of ['localStorage', 'sessionStorage'] as const) {
      if (!(globalThis as any)[key]) {
        const store = new Map<string, string>();
        (globalThis as any)[key] = {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, String(v)),
          removeItem: (k: string) => store.delete(k),
          clear: () => store.clear(),
        };
      }
    }
    if (!window.matchMedia) {
      (window as any).matchMedia = (query: string) => ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
    }
  });

  function create() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => backend.verify());

  it('shows a loading status while events are being fetched', () => {
    const { el } = create();
    expect(el.textContent).toContain('Loading events');
    backend.expectOne((r) => r.url === UPCOMING).flush(page('published_events_upcoming', []));
    backend.expectOne((r) => r.url === PAST).flush(page('published_events_past', []));
  });

  it('shows an error with Retry when the API is unavailable, and recovers on retry', async () => {
    const { fixture, el } = create();
    backend
      .expectOne((r) => r.url === UPCOMING)
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    backend.match((r) => r.url === PAST).forEach((r) => r.flush(page('published_events_past', [])));
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Events are temporarily unavailable',
    );

    const retry = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Retry',
    );
    retry!.click();
    fixture.detectChanges();
    backend.expectOne((r) => r.url === UPCOMING).flush(page('published_events_upcoming', []));
    backend
      .expectOne((r) => r.url === PAST)
      .flush(page('published_events_past', [ev('demo-past', 'Past Demo')]));
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Past Demo');
  });

  it('shows an empty state when no events are published', async () => {
    const { fixture, el } = create();
    backend.expectOne((r) => r.url === UPCOMING).flush(page('published_events_upcoming', []));
    backend.expectOne((r) => r.url === PAST).flush(page('published_events_past', []));
    await settle(fixture);
    expect(el.textContent).toContain('No events published yet');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
