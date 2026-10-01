import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ApprovalInboxComponent } from './approval-inbox.component';

function inboxItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'v1',
    number: 1,
    state: 'SUBMITTED',
    content_item_id: 'ci1',
    content_type: 'page',
    slug: 'about',
    owner_vertical: null,
    author_email: 'author@test.example',
    change_note: '',
    updated_at: '2026-01-01T00:00:00Z',
    pending_action: 'open_review',
    ...overrides,
  };
}

function create(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ApiService, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(ApprovalInboxComponent);
  return fixture;
}

describe('ApprovalInboxComponent', () => {
  it('loads both tabs and filters the pending list by content type', async () => {
    const pending = [
      inboxItem({ id: 'v1', content_type: 'page', slug: 'about' }),
      inboxItem({ id: 'v2', content_type: 'blog', slug: 'launch' }),
    ];
    const api: Partial<ApiService> = {
      get: async (path: string) => {
        if (path === '/content/inbox') return { results: pending, count: 2, next: null, previous: null } as never;
        if (path === '/content/mine') return { results: [], count: 0, next: null, previous: null } as never;
        throw new Error(`unexpected path ${path}`);
      },
    };

    const fixture = create(api);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['filteredPending']().length).toBe(2);

    fixture.componentInstance['contentTypeFilter'] = 'blog';
    fixture.componentInstance.applyFilters();
    expect(fixture.componentInstance['filteredPending']().map((i) => i.id)).toEqual(['v2']);
  });

  it('never sends a client-chosen scope filter to the server', async () => {
    const calls: string[] = [];
    const api: Partial<ApiService> = {
      get: async (path: string, query?: Record<string, unknown>) => {
        calls.push(path);
        // The only params ever sent are pagination — never an author/vertical
        // id chosen client-side, which would be a scope-widening attempt.
        expect(Object.keys(query ?? {})).toEqual(['page']);
        return { results: [], count: 0, next: null, previous: null } as never;
      },
    };

    const fixture = create(api);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(calls).toEqual(['/content/inbox', '/content/mine']);
  });
});
