import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The member platform is session-dependent: rendered in the browser only,
  // never prerendered into static HTML.
  { path: 'platform/**', renderMode: RenderMode.Client },
  { path: 'platform', renderMode: RenderMode.Client },
  // Phase 2B CMS cutover route: SSR'd per-request (RenderMode.Server), not
  // build-time prerendered. True static prerendering would require the
  // Django backend to be reachable during `ng build`, which is a Phase
  // 2E build/deploy-pipeline integration point (docs/25
  // "SSR/prerender"), not something to wire into the existing build now.
  { path: 'content/**', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Prerender },
];
