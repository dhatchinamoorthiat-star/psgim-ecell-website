import { RenderMode, ServerRoute } from '@angular/ssr';
import { verticalSlugs } from './core/data/team.data';
import { BLOG_ARTICLES } from './core/data/blog-series.data';

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
  // The five verticals come from a static array in `team.data.ts`, so every
  // one of these URLs is known at build time — there is no backend to reach.
  // They were previously rendered per request, which paid an SSR cost on
  // every visit for content that can be a static file.
  {
    path: 'meet-the-team/vertical/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => verticalSlugs.map((slug) => ({ slug })),
  },
  // `member/:slug` is a reserved redirect (meet-the-team.routes.ts) with an
  // unbounded parameter, so its URLs cannot be enumerated for prerendering.
  // Resolved per request so legacy external links still redirect.
  { path: 'meet-the-team/member/**', renderMode: RenderMode.Server },
  // Production is a static Cloudflare Pages upload with no SSR server, so a
  // RenderMode.Server route emits no HTML and Pages answers it with the root
  // index.html (the homepage). Both routes below are therefore prerendered.
  //
  // Blogs read only the static `blog-series.data.ts` catalogue, so every
  // article URL is known at build time.
  { path: 'blogs', renderMode: RenderMode.Prerender },
  {
    path: 'blogs/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      [...new Set(BLOG_ARTICLES.map((a) => a.slug))].map((slug) => ({ slug })),
  },
  // Events come from the API at runtime. The prerendered page is the shell
  // (hero, filters, loading skeleton); EventsComponent fetches only in the
  // browser, so no backend is needed at build time.
  { path: 'events', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];
