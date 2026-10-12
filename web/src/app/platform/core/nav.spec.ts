import { visibleNav } from './nav';
import { safeReturnUrl } from '../auth/login.component';

describe('visibleNav', () => {
  it('shows only what the user may open', () => {
    const labels = (perms: string[]) =>
      visibleNav((p) => perms.includes(p)).flatMap((s) => s.items.map((i) => i.label));
    expect(labels([])).toEqual(['Dashboard', 'My events', 'QR Generator', 'Approvals']);
    expect(labels(['vertical.view'])).toEqual([
      'Dashboard',
      'My events',
      'QR Generator',
      'Approvals',
      'Control Center',
      'Verticals',
    ]);
    expect(labels(['user.view', 'vertical.view', 'role.view'])).toEqual([
      'Dashboard',
      'My events',
      'QR Generator',
      'Approvals',
      'Control Center',
      'Users',
      'Verticals',
      'Roles',
      'Assignments',
    ]);
  });

  it('drops empty sections', () => {
    expect(visibleNav(() => false).map((s) => s.label)).toEqual(['Overview', 'Tools']);
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

  it('shows Phase C operations and participant administration only to holders', () => {
    const labels = (perms: string[]) =>
      visibleNav((p) => perms.includes(p)).flatMap((s) => s.items.map((i) => i.label));
    expect(labels([])).not.toContain('Operations');
    expect(labels(['event.checkin'])).toContain('Operations');
    expect(labels(['event.checkin'])).not.toContain('Participants');
    expect(labels(['participant.manage'])).toContain('Participants');
  });
});
