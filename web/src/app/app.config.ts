import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { trailingSlashUrlSerializerProvider } from './core/trailing-slash-url-serializer';

// The session-scoped auth state and the session-expiry interceptor remain
// provided only by /platform (platform/platform.routes.ts). HttpClient
// itself is now provided here too (Phase 2B ContentApiService, GET-only,
// unauthenticated public content — no CSRF/session interceptor needed);
// withFetch() uses the platform fetch API, which works identically during
// SSR/prerender and in the browser.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    trailingSlashUrlSerializerProvider,
  ],
};
