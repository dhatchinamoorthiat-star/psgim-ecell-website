import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The member platform is session-dependent: rendered in the browser only,
  // never prerendered into static HTML.
  { path: 'platform/**', renderMode: RenderMode.Client },
  { path: 'platform', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
