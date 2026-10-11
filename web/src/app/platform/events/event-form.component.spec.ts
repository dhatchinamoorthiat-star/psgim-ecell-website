import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { EventFormComponent } from './event-form.component';
import { AdminEvent, statusLabel, writableDetail } from './events-admin-api.service';

const BASE = '/api/v1/content/events';

function adminEvent(over: Partial<AdminEvent> = {}): AdminEvent {
  return {
    id: '1',
    slug: 'demo-day',
    state: 'DRAFT',
    owner_vertical: null,
    is_published: false,
    draft: {
      id: 'v2',
      number: 2,
      state: 'DRAFT',
      updated_at: '2026-10-11T10:00:00.123456Z',
      detail: {
        title: 'Demo Day',
        venue: 'Hall A',
        speakers: [{ name: 'Kept Speaker' }],
        gallery: [{ src: '/events/demo-day/01.jpg', alt: 'Stage' }],
        pending: false,
        source: 'linkedin',
      },
    },
    published: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

describe('Event administration', () => {
  let backend: HttpTestingController;

  function create(
    slug: string | null,
    perms: string[] = ['event.view', 'event.edit', 'content.publish'],
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(slug ? { slug } : {}) } },
        },
        { provide: AuthService, useValue: { canAnywhere: (p: string) => perms.includes(p) } },
        { provide: ApiService, useValue: { verticals: async () => ({ results: [] }) } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      cmp: fixture.componentInstance as any,
    };
  }

  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => backend?.verify());

  it('never sends provenance fields back to the server', () => {
    const d = writableDetail({ title: 'x', pending: true, source: 'linkedin' } as any);
    expect(d).toEqual({ title: 'x' });
  });

  it('labels workflow states for editors', () => {
    expect(statusLabel(adminEvent())).toBe('Draft');
    expect(statusLabel(adminEvent({ draft: { ...adminEvent().draft!, state: 'APPROVED' } }))).toBe(
      'Approved, ready to publish',
    );
    expect(statusLabel(adminEvent({ is_published: true, draft: null }))).toBe('Live');
  });

  it('saves the draft with the concurrency token and preserves fields the form does not edit', async () => {
    const { fixture, cmp } = create('demo-day');
    backend.expectOne(`${BASE}/demo-day`).flush(adminEvent());
    await settle(fixture);
    cmp.model.venue = 'Hall B';
    const saving = cmp.save();
    const req = backend.expectOne(`${BASE}/demo-day`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.expected_updated_at).toBe('2026-10-11T10:00:00.123456Z');
    expect(req.request.body.detail.venue).toBe('Hall B');
    expect(req.request.body.detail.speakers).toEqual([{ name: 'Kept Speaker' }]);
    expect(req.request.body.detail.gallery).toEqual([
      { src: '/events/demo-day/01.jpg', alt: 'Stage' },
    ]);
    expect('pending' in req.request.body.detail).toBe(false);
    expect('source' in req.request.body.detail).toBe(false);
    req.flush(adminEvent());
    await saving;
  });

  it('explains a stale-edit conflict instead of overwriting', async () => {
    const { fixture, cmp, el } = create('demo-day');
    backend.expectOne(`${BASE}/demo-day`).flush(adminEvent());
    await settle(fixture);
    const saving = cmp.save();
    backend
      .expectOne(`${BASE}/demo-day`)
      .flush(
        { error: { code: 'stale_version', message: 'x' } },
        { status: 409, statusText: 'Conflict' },
      );
    await saving;
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Someone else changed this draft',
    );
  });

  it('offers Publish only for an approved draft, and never a schedule control', async () => {
    const { fixture, el } = create('demo-day');
    backend.expectOne(`${BASE}/demo-day`).flush(adminEvent());
    await settle(fixture);
    const buttons = () =>
      Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons()).not.toContain('Publish');
    expect(buttons()).toContain('Submit for review');
    expect(el.querySelector('input[name*="schedule" i], input[name="publish_at"]')).toBeNull();
    expect(el.textContent).toContain('Scheduled publishing is not available yet');
  });

  it('shows Publish once approved, for someone who can publish', async () => {
    const { fixture, el } = create('demo-day');
    backend
      .expectOne(`${BASE}/demo-day`)
      .flush(adminEvent({ draft: { ...adminEvent().draft!, state: 'APPROVED' } }));
    await settle(fixture);
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim())).toContain(
      'Publish',
    );
  });

  it('hides Publish from editors without content.publish (the server would refuse anyway)', async () => {
    const { fixture, el } = create('demo-day', ['event.view', 'event.edit']);
    backend
      .expectOne(`${BASE}/demo-day`)
      .flush(adminEvent({ draft: { ...adminEvent().draft!, state: 'APPROVED' } }));
    await settle(fixture);
    expect(
      Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim()),
    ).not.toContain('Publish');
  });
});
