import { TestBed } from '@angular/core/testing';
import { ApiService } from '../core/api.service';
import { ApprovalsApiService } from './approvals-api.service';

function setup(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    providers: [ApprovalsApiService, { provide: ApiService, useValue: api }],
  });
  return TestBed.inject(ApprovalsApiService);
}

describe('ApprovalsApiService', () => {
  it('requires a rejection comment to be sent to request-changes', async () => {
    const calls: { path: string; body: unknown }[] = [];
    const svc = setup({
      post: async (path: string, body?: unknown) => {
        calls.push({ path, body });
        return {} as never;
      },
    });
    await svc.requestChanges('v1', 'needs a citation');
    expect(calls).toEqual([
      { path: '/content/versions/v1/request-changes', body: { comment: 'needs a citation' } },
    ]);
  });

  it('hits the exact workflow-transition endpoints, never a generic mutation endpoint', async () => {
    const calls: string[] = [];
    const svc = setup({
      post: async (path: string) => {
        calls.push(path);
        return {} as never;
      },
    });
    await svc.submit('v1');
    await svc.openReview('v1');
    await svc.approve('v1');
    await svc.publish('v1');
    expect(calls).toEqual([
      '/content/versions/v1/submit',
      '/content/versions/v1/review',
      '/content/versions/v1/approve',
      '/content/versions/v1/publish',
    ]);
  });

  it('reads the inbox and mine lists from their own scoped endpoints', async () => {
    const calls: string[] = [];
    const svc = setup({
      get: async (path: string) => {
        calls.push(path);
        return { results: [], count: 0, next: null, previous: null } as never;
      },
    });
    await svc.inbox();
    await svc.mine();
    expect(calls).toEqual(['/content/inbox', '/content/mine']);
  });
});
