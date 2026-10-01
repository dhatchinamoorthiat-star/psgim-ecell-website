/**
 * Platform navigation. An item is shown when the user holds any of its
 * permissions in some scope. Hiding is convenience; the API decides.
 */
export interface NavItem {
  label: string;
  path: string;
  anyOf: string[]; // empty = every signed-in user
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const PLATFORM_NAV: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', path: '/platform/dashboard', anyOf: [] },
      { label: 'Approvals', path: '/platform/approvals', anyOf: [] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', path: '/platform/admin/users', anyOf: ['user.view'] },
      { label: 'Verticals', path: '/platform/admin/verticals', anyOf: ['vertical.view'] },
      { label: 'Roles', path: '/platform/admin/roles', anyOf: ['role.view'] },
      { label: 'Assignments', path: '/platform/admin/assignments', anyOf: ['role.view'] },
    ],
  },
];

export function visibleNav(can: (perm: string) => boolean): NavSection[] {
  return PLATFORM_NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.anyOf.length === 0 || i.anyOf.some(can)),
  })).filter((s) => s.items.length > 0);
}
