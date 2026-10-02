import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withFetch,
  withXsrfConfiguration,
} from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { CSRF_COOKIE, CsrfTokenExtractor } from './core/csrf-token.extractor';
import { trailingSlashUrlSerializerProvider } from './core/trailing-slash-url-serializer';

// The session-scoped auth state and the session-expiry interceptor remain
// provided only by /platform (platform/platform.routes.ts). HttpClient
// itself is provided here too: the CMS public read API (Phase 2B
// ContentApiService, GET-only) and the public membership-interest form, which
// POSTs. withFetch() uses the platform fetch API, which works identically
// during SSR/prerender and in the browser.
//
// The XSRF configuration matches /platform's (ADR-004): Angular echoes
// Django's `csrftoken` cookie as X-CSRFToken so `csrf_protect` accepts the
// POST. It is inert during SSR/prerender — there is no cookie on the server,
// the extractor returns null, and no request is made at render time anyway.
// Angular's XSRF interceptor only attaches the header to same-origin,
// state-changing requests, so existing GETs are untouched.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: CSRF_COOKIE, headerName: 'X-CSRFToken' }),
    ),
    { provide: HttpXsrfTokenExtractor, useClass: CsrfTokenExtractor },
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    trailingSlashUrlSerializerProvider,
  ],
};
