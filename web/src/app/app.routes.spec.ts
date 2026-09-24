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
});
