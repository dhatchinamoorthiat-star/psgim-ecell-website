import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { trailingSlashUrlSerializerProvider } from './core/trailing-slash-url-serializer';

// HttpClient, the auth state and the session-expiry interceptor are provided
// by the /platform route itself (platform/platform.routes.ts), so none of it
// is loaded by the public site.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    trailingSlashUrlSerializerProvider,
  ],
};
