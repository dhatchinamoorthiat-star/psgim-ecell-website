import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventsComponent } from './events.component';

const UPCOMING = '/api/v1/content/public/dynamic/published_events_upcoming';
const PAST = '/api/v1/content/public/dynamic/published_events_past';

/** Test-only fixture rows — shaped like the API, never shipped. */
function ev(slug: string, title: string, startsAt: string) {
  return {
    slug,
    title,
    starts_at: startsAt,
    ends_at: null,
    speakers: [],
    gallery: [],
    pending: false,
  };
}

function page(query: string, results: unknown[]) {
  return { query, sort: 'starts_at_asc', count: results.length, results };
}

describe('EventsComponent', () => {
  let backend: HttpTestingController;

  // jsdom has no IntersectionObserver; the page's reveal-on-scroll directive needs one.
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
  });

  function create() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EventsComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /** Lets the load() promise chain finish, then re-renders. */
  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function respond(upcoming: unknown[], past: unknown[]) {
    backend.expectOne((r) => r.url === UPCOMING).flush(page('published_events_upcoming', upcoming));
    backend.expectOne((r) => r.url === PAST).flush(page('published_events_past', past));
  }

  function fail(status: number) {
    const body = { error: { code: 'api_unavailable', message: 'x' } };
    backend
      .expectOne((r) => r.url === UPCOMING)
      .flush(body, { status, statusText: 'Service Unavailable' });
    // Promise.all rejects on the first failure; the sibling request still goes out.
    backend.match((r) => r.url === PAST).forEach((r) => r.flush(page('published_events_past', [])));
  }

  afterEach(() => backend.verify());

  it('shows a loading status (not bare headings) while the API has not answered', () => {
    const { el } = create();
    expect(el.querySelector('ui-load-state [role="status"]')?.textContent).toContain(
      'Loading events',
    );
    expect(el.textContent).not.toContain("What's next");
    expect(el.textContent).not.toContain('What happened');
    respond([], []);
  });

  it('renders upcoming and past rows from the API', async () => {
    const { fixture, el } = create();
    respond(
      [ev('demo-upcoming', 'Upcoming Demo', '2099-01-01T10:00:00Z')],
      [ev('demo-past', 'Past Demo', '2000-01-01T10:00:00Z')],
    );
    await settle(fixture);
    expect(el.querySelector('ui-load-state')).toBeNull();
    expect(el.textContent).toContain('Upcoming Demo');
    expect(el.textContent).toContain('Past Demo');
  });

  it('shows the empty states when the API answers with no events', async () => {
    const { fixture, el } = create();
    respond([], []);
    await settle(fixture);
    expect(el.textContent).toContain('No upcoming events scheduled');
    expect(el.textContent).toContain('No past events recorded yet.');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error state with Retry when the API is unavailable, and recovers on retry', async () => {
    const { fixture, el } = create();
    fail(503);
    await settle(fixture);

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Events are temporarily unavailable');
    expect(el.textContent).not.toContain("What's next");
    const retry = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Retry',
    );
    expect(retry).toBeTruthy();

    retry!.click();
    fixture.detectChanges();
    expect(el.querySelector('ui-load-state [role="status"]')).not.toBeNull();

    respond([ev('demo-upcoming', 'Upcoming Demo', '2099-01-01T10:00:00Z')], []);
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Upcoming Demo');
  });

  it('treats a network failure (status 0) as an error, not an empty calendar', async () => {
    const { fixture, el } = create();
    backend.expectOne((r) => r.url === UPCOMING).error(new ProgressEvent('error'));
    backend.match((r) => r.url === PAST).forEach((r) => r.flush(page('published_events_past', [])));
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No upcoming events scheduled');
  });

  it('makes no API request during prerender (server platform) and renders the loading shell', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EventsComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    backend.expectNone((r) => r.url.startsWith('/api/'));
    expect(el.querySelector('h1')?.textContent).toBe('Events');
    expect(el.querySelector('ui-load-state [role="status"]')).not.toBeNull();
  });
});
