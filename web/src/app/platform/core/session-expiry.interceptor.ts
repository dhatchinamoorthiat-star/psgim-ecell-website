import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const QUIET = ['/api/v1/auth/me', '/api/v1/auth/login', '/api/v1/auth/csrf'];

/**
 * A 401 from any other endpoint means the session ended underneath us
 * (expired, password reset elsewhere, account deactivated). Drop the local
 * state and send the user to sign in, remembering where they were.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !QUIET.some((p) => req.url.startsWith(p))
      ) {
        auth.markExpired();
        router.navigate(['/platform/login'], {
          queryParams: { returnUrl: router.url, reason: 'expired' },
        });
      }
      return throwError(() => err);
    }),
  );
};
