import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ApprovalReviewComponent } from './approval-review.component';

function version(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'v1',
    content_item: 'ci1',
    content_type: 'page',
    slug: 'about',
    number: 1,
    state: 'IN_REVIEW',
    blocks: { schema_version: 1, blocks: [] },
    seo: {},
    author_email: 'author@test.example',
    change_note: '',
    approval_stages_snapshot: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function fakeAuth(email: string) {
  return { user: () => ({ id: 'u1', email }) };
}

function create(api: Partial<ApiService>, authEmail = 'reviewer@test.example') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: fakeAuth(authEmail) },
    ],
  });
  const fixture = TestBed.createComponent(ApprovalReviewComponent);
  fixture.componentRef.setInput('versionId', 'v1');
  return fixture;
}

describe('ApprovalReviewComponent', () => {
  it('shows approve/reject to a reviewer but hides them from the version author', async () => {
    const api: Partial<ApiService> = {
      get: async (path: string) => {
        if (path === '/content/versions/v1') return version() as never;
        return { results: [], count: 0, next: null, previous: null } as never;
      },
    };

    const reviewerFixture = create(api, 'reviewer@test.example');
    await reviewerFixture.whenStable();
    reviewerFixture.detectChanges();
    expect(reviewerFixture.componentInstance.canDecide()).toBe(true);

    TestBed.resetTestingModule();
    const authorFixture = create(api, 'author@test.example');
    await authorFixture.whenStable();
    authorFixture.detectChanges();
    expect(authorFixture.componentInstance.canDecide()).toBe(false);
  });

  it('refuses to submit a rejection with no reason, without calling the API', async () => {
    let requestChangesCalled = false;
    const api: Partial<ApiService> = {
      get: async (path: string) => {
        if (path === '/content/versions/v1') return version() as never;
        return { results: [], count: 0, next: null, previous: null } as never;
      },
      post: async (path: string) => {
        if (path.endsWith('/request-changes')) requestChangesCalled = true;
        return version() as never;
      },
    };

    const fixture = create(api);
    await fixture.whenStable();
    fixture.detectChanges();

    await fixture.componentInstance.doReject({ reason: '   ' });

    expect(requestChangesCalled).toBe(false);
    expect(fixture.componentInstance.actionError()).toContain('reason is required');
  });

  it('records an approval and refreshes history on success', async () => {
    let approveCalled = false;
    const historyRow = {
      id: 'a1',
      content_version: 'v1',
      stage_index: 0,
      stage_kind: 'ORGANIZATIONAL',
      approver_email: 'reviewer@test.example',
      decision: 'approved' as const,
      comment: '',
      created_at: '2026-01-02T00:00:00Z',
    };
    const api: Partial<ApiService> = {
      get: async (path: string) => {
        if (path === '/content/versions/v1') return version() as never;
        if (path === '/content/versions/v1/approvals') {
          return {
            results: approveCalled ? [historyRow] : [],
            count: approveCalled ? 1 : 0,
            next: null,
            previous: null,
          } as never;
        }
        return { results: [], count: 0, next: null, previous: null } as never;
      },
      post: async (path: string) => {
        if (path.endsWith('/approve')) {
          approveCalled = true;
          return version({ state: 'APPROVED' }) as never;
        }
        return version() as never;
      },
    };

    const fixture = create(api);
    await fixture.whenStable();
    fixture.detectChanges();

    await fixture.componentInstance.doApprove();

    expect(fixture.componentInstance.version()?.state).toBe('APPROVED');
    expect(fixture.componentInstance.history().length).toBe(1);
    expect(fixture.componentInstance.actionError()).toBeNull();
  });
});
