import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from './api.service';
import { Grant, Me } from './api.types';
import { AuthService } from './auth.service';

function me(permissions: Grant[]): Me {
  return {
    user: {
      id: 'u1',
      email: 'a@test.example',
      full_name: 'A',
      status: 'active',
      email_verified_at: null,
    },
    permissions,
    organization: { name: 'PSGIM E-Cell', timezone: 'Asia/Kolkata' },
  };
}

function setup(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    providers: [AuthService, { provide: ApiService, useValue: api }],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  it('starts unknown and becomes anonymous on 401', async () => {
    const auth = setup({
      csrf: async () => ({ csrf_token: 't' }),
      me: async () => Promise.reject(new ApiError(401, 'not_authenticated', 'x')),
    });
    expect(auth.state()).toBe('unknown');
    await auth.ensureLoaded();
    expect(auth.state()).toBe('anonymous');
    expect(auth.user()).toBeNull();
  });

  it('bootstraps CSRF before asking who is signed in', async () => {
    const calls: string[] = [];
    const auth = setup({
      csrf: async () => (calls.push('csrf'), { csrf_token: 't' }),
      me: async () => (calls.push('me'), me([])),
    });
    await auth.ensureLoaded();
    expect(calls).toEqual(['csrf', 'me']);
    expect(auth.state()).toBe('authenticated');
  });

  it('answers permission questions by scope', async () => {
    const auth = setup({
      csrf: async () => ({ csrf_token: 't' }),
      me: async () =>
        me([
          { permission: 'vertical.view', scope_type: 'VERTICAL', scope_id: 'v1', own_only: false },
          { permission: 'user.manage', scope_type: 'GLOBAL', scope_id: null, own_only: false },
          { permission: 'blog.edit', scope_type: 'VERTICAL', scope_id: 'v1', own_only: true },
        ]),
    });
    await auth.ensureLoaded();
    expect(auth.canGlobal('user.manage')).toBe(true);
    expect(auth.canGlobal('vertical.view')).toBe(false);
    expect(auth.canAnywhere('vertical.view')).toBe(true);
    expect(auth.canIn('vertical.view', 'VERTICAL', 'v1')).toBe(true);
    expect(auth.canIn('vertical.view', 'VERTICAL', 'v2')).toBe(false);
    expect(auth.canIn('user.manage', 'VERTICAL', 'v2')).toBe(true); // global covers every scope
    expect(auth.canAnywhere('blog.edit')).toBe(false); // own-only is not a screen-level grant
  });

  it('forgets everything when the session expires', async () => {
    const auth = setup({ csrf: async () => ({ csrf_token: 't' }), me: async () => me([]) });
    await auth.ensureLoaded();
    auth.markExpired();
    expect(auth.state()).toBe('anonymous');
    expect(auth.grants()).toEqual([]);
  });
});
