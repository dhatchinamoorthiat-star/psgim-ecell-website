import { DOCUMENT } from '@angular/common';
import { HttpXsrfTokenExtractor } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export const CSRF_COOKIE = 'csrftoken'; // Django's CSRF_COOKIE_NAME (backend/config/settings/base.py)

/**
 * Reads Django's CSRF cookie for Angular's XSRF interceptor.
 *
 * Why this exists: HttpClient is provided by the /platform route, not the
 * root injector (so the public site never loads it). Angular's built-in
 * cookie extractor is a root singleton and therefore never sees a
 * route-level `withXsrfConfiguration({ cookieName })` — it keeps looking for
 * the default `XSRF-TOKEN` cookie and sends no header. Providing the
 * extractor next to HttpClient fixes that.
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
