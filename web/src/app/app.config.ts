import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withFetch,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  Router,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { CSRF_COOKIE, CsrfTokenExtractor } from './core/csrf-token.extractor';
import { trailingSlashUrlSerializerProvider } from './core/trailing-slash-url-serializer';
import { CinematicBootService } from './core/services/cinematic-boot.service';

/**
 * Detects browser-back/forward navigation and stamps `data-vt-direction` on
 * `<html>` before the view transition renders, so CSS can use direction-aware
 * keyframes. The attribute is cleaned up once the transition finishes.
 *
 * Runs only in the browser — `onViewTransitionCreated` is never called during
 * SSR/prerender, so there are no DOM assumptions on the server.
 */
function onViewTransitionCreated({ transition }: { transition: ViewTransition }): void {
  const router = inject(Router);
  const nav = router.getCurrentNavigation();

  // `trigger === 'popstate'` covers both back AND forward browser navigation.
  // We treat both as "back" for the spatial axis — the index is always "above"
  // the detail, so returning to it is always upward regardless of history direction.
  const direction = nav?.trigger === 'popstate' ? 'back' : 'forward';

  if (typeof document !== 'undefined') {
    document.documentElement.dataset['vtDirection'] = direction;
    // Clean up after the transition so the attribute doesn't linger.
    void transition.finished
      .catch(() => {
        /* harmless: transition was skipped due to rapid navigation */
      })
      .finally(() => {
        delete document.documentElement.dataset['vtDirection'];
      });
  }
}

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
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ onViewTransitionCreated }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideClientHydration(),
    trailingSlashUrlSerializerProvider,
    provideAppInitializer(() => inject(CinematicBootService).init()),
  ],
};
