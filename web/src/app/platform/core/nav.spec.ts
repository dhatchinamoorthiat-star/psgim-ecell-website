import { visibleNav } from './nav';
import { safeReturnUrl } from '../auth/login.component';

describe('visibleNav', () => {
  it('shows only what the user may open', () => {
    const labels = (perms: string[]) =>
      visibleNav((p) => perms.includes(p)).flatMap((s) => s.items.map((i) => i.label));
    expect(labels([])).toEqual(['Dashboard']);
    expect(labels(['vertical.view'])).toEqual(['Dashboard', 'Verticals']);
    expect(labels(['user.view', 'vertical.view', 'role.view'])).toEqual([
      'Dashboard',
      'Users',
      'Verticals',
      'Roles',
      'Assignments',
    ]);
  });

  it('drops empty sections', () => {
    expect(visibleNav(() => false).map((s) => s.label)).toEqual(['Workspace']);
  });
});

describe('safeReturnUrl', () => {
  it('only returns to platform paths', () => {
    expect(safeReturnUrl('/platform/admin/users')).toBe('/platform/admin/users');
    for (const bad of [
      'https://evil.example/',
      '//evil.example/platform/x',
      '/about/',
      '',
      undefined,
      null,
      '/platform/x?next=https://e',
    ]) {
      expect(safeReturnUrl(bad)).toBe('/platform/dashboard');
    }
  });
});
