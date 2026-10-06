import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from './auth.service';
import { anonymousOnlyGuard, authGuard, permissionGuard } from './guards';

function fakeAuth(state: 'anonymous' | 'authenticated', perms: string[] = []) {
  return {
    ensureLoaded: async () => undefined,
    state: () => state,
    canAnywhere: (p: string) => perms.includes(p),
  };
}

async function run(guard: typeof authGuard, auth: object, url = '/platform/admin/users') {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const result = await TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
}

describe('platform guards', () => {
  it('sends anonymous visitors to sign in, remembering the page', async () => {
    expect(await run(authGuard, fakeAuth('anonymous'))).toBe(
      '/platform/loginpage?returnUrl=%2Fplatform%2Fadmin%2Fusers',
    );
  });

  it('lets signed-in users through', async () => {
    expect(await run(authGuard, fakeAuth('authenticated'))).toBe(true);
  });

  it('keeps signed-in users away from the login screen', async () => {
    expect(await run(anonymousOnlyGuard, fakeAuth('authenticated'))).toBe('/platform/dashboard');
  });

  it('routes users without the permission to the forbidden page', async () => {
    expect(
      await run(permissionGuard('user.view'), fakeAuth('authenticated', ['vertical.view'])),
    ).toBe('/platform/forbidden');
    TestBed.resetTestingModule();
    expect(
      await run(
        permissionGuard('user.view', 'role.view'),
        fakeAuth('authenticated', ['role.view']),
      ),
    ).toBe(true);
  });
});
