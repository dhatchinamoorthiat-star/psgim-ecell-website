import { RenderMode } from '@angular/ssr';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';

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
      'blogs',
      'team',
      'gallery',
      'nec',
      'contact',
      'soon',
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
});
