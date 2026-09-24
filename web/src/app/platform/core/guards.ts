import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Note: every inject() must happen before the first `await` — Angular's
// injection context does not survive an await.

/** Anonymous visitors are sent to sign in, keeping where they were going. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded().catch(() => undefined);
  if (auth.state() === 'authenticated') return true;
  return router.createUrlTree(['/platform/login'], { queryParams: { returnUrl: state.url } });
};

/** Signed-in users do not need the sign-in screens. */
export const anonymousOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded().catch(() => undefined);
  return auth.state() === 'authenticated' ? router.createUrlTree(['/platform/dashboard']) : true;
};

/** Screen needs at least one of these permissions in some scope. UX only — the API enforces. */
export function permissionGuard(...perms: string[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ensureLoaded().catch(() => undefined);
    if (perms.some((p) => auth.canAnywhere(p))) return true;
    return router.createUrlTree(['/platform/forbidden']);
  };
}
