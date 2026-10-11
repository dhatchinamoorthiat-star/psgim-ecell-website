import { RenderMode } from '@angular/ssr';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { BLOG_ARTICLES } from './core/data/blog-series.data';

describe('app routes', () => {
  it('keeps every public URL from before the platform existed', () => {
    const shell = routes.find((r) => r.path === '' && r.children);
    const publicPaths = (shell?.children ?? []).map((r) => r.path);
    expect(publicPaths).toEqual([
      '',
      'about',
      'origin',
      'vision-mission',
      'reach',
      'spotlight',
      'history',
      'initiatives',
      'podcast',
      'website-av',
      'events',
      'events/:slug',
      'blogs',
      'team',
      'gallery',
      'nec',
      'contact',
      'testimonials',
      'meet-the-team',
      'soon',
      'index-experiment',
      'home-experiment',
      'control',
      'content/:contentType/:slug',
    ]);
  });

  it('lazy-loads the platform and never prerenders it', () => {
    const platform = routes.find((r) => r.path === 'platform');
    expect(platform?.loadChildren).toBeDefined();
    const platformRender = serverRoutes
      .filter((r) => r.path.startsWith('platform'))
      .map((r) => r.renderMode);
    expect(platformRender.length).toBeGreaterThan(0);
    expect(serverRoutes.findIndex((r) => r.path.startsWith('platform'))).toBeLessThan(
      serverRoutes.findIndex((r) => r.path === '**'),
    );
  });

  it('serves the Phase 2B CMS cutover route via SSR, not build-time prerender', () => {
    const cmsRoute = serverRoutes.find((r) => r.path === 'content/**');
    expect(cmsRoute?.renderMode).toBe(RenderMode.Server);
    expect(serverRoutes.findIndex((r) => r.path === 'content/**')).toBeLessThan(
      serverRoutes.findIndex((r) => r.path === '**'),
    );
    // Every other public route is unaffected and still falls through to prerender.
    expect(serverRoutes.find((r) => r.path === '**')?.renderMode).toBe(RenderMode.Prerender);
  });

  it('prerenders /events and /blogs (static Pages has no SSR server to answer them)', async () => {
    for (const path of ['events', 'blogs', 'blogs/:slug']) {
      expect(serverRoutes.find((r) => r.path === path)?.renderMode).toBe(RenderMode.Prerender);
    }
    expect(
      serverRoutes.some(
        (r) => /^(events|blogs)/.test(r.path) && r.renderMode === RenderMode.Server,
      ),
    ).toBe(false);
    const blogArticles = serverRoutes.find((r) => r.path === 'blogs/:slug') as {
      getPrerenderParams?: () => Promise<Record<string, string>[]>;
    };
    const params = (await blogArticles.getPrerenderParams?.()) ?? [];
    expect(params.map((p) => p['slug']).sort()).toEqual(
      [...new Set(BLOG_ARTICLES.map((a) => a.slug))].sort(),
    );
  });

  it('serves event detail pages in the browser (no API at build time) and keeps the listing prerendered', () => {
    expect(serverRoutes.find((r) => r.path === 'events/:slug')?.renderMode).toBe(RenderMode.Client);
    expect(serverRoutes.find((r) => r.path === 'events')?.renderMode).toBe(RenderMode.Prerender);
    expect(serverRoutes.findIndex((r) => r.path === 'events/:slug')).toBeLessThan(
      serverRoutes.findIndex((r) => r.path === '**'),
    );
  });
});
