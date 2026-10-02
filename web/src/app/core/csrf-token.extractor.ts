import { DOCUMENT } from '@angular/common';
import { HttpXsrfTokenExtractor } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export const CSRF_COOKIE = 'csrftoken'; // Django's CSRF_COOKIE_NAME (backend/config/settings/base.py)

/**
 * Reads Django's CSRF cookie for Angular's XSRF interceptor.
 *
 * Why this exists: Angular's built-in cookie extractor looks for the default
 * `XSRF-TOKEN` cookie, not Django's `csrftoken`, so without this it sends no
 * header at all. It is also a root singleton, which means a route-level
 * `withXsrfConfiguration({ cookieName })` — as /platform uses — would never
 * reach it. Providing this class alongside each `provideHttpClient` fixes
 * both halves.
 *
 * Lives in core/ because both HttpClient instances now need it: the root one
 * (public site, for the membership-interest form) and the /platform one.
 */
@Injectable()
export class CsrfTokenExtractor extends HttpXsrfTokenExtractor {
  private doc = inject(DOCUMENT);

  getToken(): string | null {
    const match = (this.doc.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(CSRF_COOKIE + '='));
    return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
  }
}
