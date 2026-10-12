import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SITE_ORIGIN } from '../../core/config/site-origin';
import { EventDetailComponent } from './event-detail.component';

const API = '/api/v1/content/public/events/';

/** Test-only fixture, shaped like the API. Never shipped. */
function ev(over: Record<string, unknown> = {}) {
  return {
    slug: 'demo-day',
    title: 'Demo Day',
    summary: 'Pitches.',
    starts_at: '2099-05-01T10:00:00Z',
    ends_at: null,
    venue: 'Hall A',
    speakers: [],
    gallery: [],
    pending: false,
    ...over,
  };
}

describe('EventDetailComponent', () => {
  let backend: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

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

  function create(slug = 'demo-day') {
    params = new BehaviorSubject(convertToParamMap({ slug }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EventDetailComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute('content') ?? null;
  const canonical = () =>
    document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

  const AVAIL = (slug: string) => `${API}${slug}/availability`;
  const notConfigured = {
    state: 'not_configured',
    opens_at: null,
    closes_at: null,
    students: false,
    external: false,
    spots_left: null,
  };

  afterEach(() => {
    // Availability is a secondary request on every successful load; tests that
    // don't care about it get "not configured" (renders nothing).
    backend.match((r) => r.url.endsWith('/availability')).forEach((r) => r.flush(notConfigured));
    backend.verify();
  });

  it('shows a loading state, then the published event', async () => {
    const { fixture, el } = create();
    expect(el.querySelector('ui-load-state [role="status"]')?.textContent).toContain(
      'Loading event',
    );
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toBe('Demo Day');
    expect(el.textContent).toContain('Hall A');
    expect(el.querySelector('ui-load-state')).toBeNull();
  });

  it('sets canonical metadata and a share URL on the configured origin', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    expect(document.title).toBe('Demo Day — PSGIM E-Cell');
    expect(canonical()).toBe(`${SITE_ORIGIN}/events/demo-day`);
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_ORIGIN}/events/demo-day`);
    expect(meta('meta[name="robots"]')).toBe('index, follow');
    expect(el.querySelector('.event-share a')?.getAttribute('href')).toBe(
      `${SITE_ORIGIN}/events/demo-day`,
    );
  });

  it('shows not-found (noindex) for a 404, never an error or private details', async () => {
    const { fixture, el } = create('secret-draft');
    backend
      .expectOne(API + 'secret-draft')
      .flush({ detail: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect(el.textContent).toContain('Event not found');
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('treats a malformed slug as not found without calling the API', async () => {
    const { fixture, el } = create('..%2Fplatform');
    backend.expectNone(() => true);
    await settle(fixture);
    expect(el.textContent).toContain('Event not found');
  });

  it('shows an error with Retry when the API is unavailable, and recovers', async () => {
    const { fixture, el } = create();
    backend
      .expectOne(API + 'demo-day')
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable');
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toBe('Demo Day');
  });

  it('renders untrusted text as text and neutralises unsafe links', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(
      ev({
        title: '<img src=x onerror="alert(1)">',
        description: '<script>alert(1)</script>',
        registration_link: 'javascript:alert(1)',
      }),
    );
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(el.querySelector('h1 img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    const register = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Register'),
    );
    expect(register?.getAttribute('href')?.startsWith('javascript:')).toBe(false);
    expect(register?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('marks illustrative events and keeps them out of search indexes', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev({ pending: true }));
    await settle(fixture);
    expect(el.textContent).toContain('Illustrative');
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('reloads when navigating to another event on the same page', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    params.next(convertToParamMap({ slug: 'other-event' }));
    fixture.detectChanges();
    backend.expectOne(API + 'other-event').flush(ev({ slug: 'other-event', title: 'Other Event' }));
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toBe('Other Event');
  });

  it('shows live availability and links registration into the signed-in platform', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    backend.expectOne(AVAIL('demo-day')).flush({
      state: 'open',
      opens_at: '2099-01-01T00:00:00Z',
      closes_at: '2099-04-30T00:00:00Z',
      students: true,
      external: false,
      spots_left: 12,
    });
    await settle(fixture);
    const section = el.querySelector('.event-registration');
    expect(section?.textContent).toContain('Registration is open until');
    expect(section?.textContent).toContain('12 place(s) left');
    expect(section?.textContent).toContain('Open to PSGIM students');
    const cta = section?.querySelector('a.btn');
    expect(cta?.getAttribute('href')).toBe('/platform/my-events/register/demo-day');
  });

  it('keeps the event page usable when availability cannot be loaded', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    backend
      .expectOne(AVAIL('demo-day'))
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    await settle(fixture);
    expect(el.querySelector('h1')?.textContent).toBe('Demo Day');
    expect(el.querySelector('.event-registration')).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('offers no registration link for a full or cancelled event', async () => {
    const { fixture, el } = create();
    backend.expectOne(API + 'demo-day').flush(ev());
    await settle(fixture);
    backend
      .expectOne(AVAIL('demo-day'))
      .flush({ ...notConfigured, state: 'cancelled', students: true });
    await settle(fixture);
    expect(el.querySelector('.event-registration')?.textContent).toContain('cancelled');
    expect(el.querySelector('.event-registration a')).toBeNull();
  });
});
