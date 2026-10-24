import type { UserRole } from '../users/entities/user.entity';

/**
 * Permissions — what a staff member may do beyond their role's basics.
 *
 *  - admin                → every permission, always.
 *  - manager / cashier    → their role's defaults + any extras an admin grants.
 *  - Some features are ADMIN-ONLY and can never be granted (staff & roles,
 *    branches, audit/activity log, recycle bin, payment settings), so nobody
 *    can promote themselves or hide their own actions.
 *  - Branch scope still applies: a granted permission only covers the
 *    person's own branch (stock, orders, reports…). The catalog is shared by
 *    all branches, so catalog permissions apply to the shared catalog.
 */
export const PERMISSIONS = [
  // Catalog
  'products.edit',
  'products.delete',
  'catalog.manage',
  // Sales
  'orders.refund',
  'inventory.manage',
  'promotions.manage',
  'customers.view',
  'reviews.moderate',
  'reviews.delete',
  // Storefront
  'storefront.manage',
  // Insights
  'reports.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** What each role can do without any extra grant. */
export const ROLE_DEFAULTS: Record<Exclude<UserRole, 'admin'>, Permission[]> = {
  manager: [
    'orders.refund',
    'inventory.manage',
    'reviews.moderate',
    'reports.view',
  ],
  cashier: [],
  customer: [],
};

/** Grouped catalog for the dashboard's Permissions panel. */
export const PERMISSION_GROUPS: { id: string; permissions: Permission[] }[] = [
  {
    id: 'catalog',
    permissions: ['products.edit', 'products.delete', 'catalog.manage'],
  },
  {
    id: 'sales',
    permissions: [
      'orders.refund',
      'inventory.manage',
      'promotions.manage',
      'customers.view',
    ],
  },
  { id: 'reviews', permissions: ['reviews.moderate', 'reviews.delete'] },
  { id: 'storefront', permissions: ['storefront.manage'] },
  { id: 'insights', permissions: ['reports.view'] },
];

/** Features no grant can unlock — shown as "Admin only" in the panel. */
export const ADMIN_ONLY_FEATURES = [
  'staff',
  'branches',
  'audit',
  'recycleBin',
  'paymentSettings',
] as const;

/** Granting these raises a security alert (they can remove or alter data). */
export const HIGH_RISK: Permission[] = [
  'products.delete',
  'storefront.manage',
  'promotions.manage',
  'reviews.delete',
];

export function isPermission(p: string): p is Permission {
  return (PERMISSIONS as readonly string[]).includes(p);
}

type PermUser = { role: UserRole; extraPermissions?: string[] | null };

/** Everything this user may do (role defaults + valid extras; all for admin). */
export function effectivePermissions(user: PermUser): Permission[] {
  if (user.role === 'admin') return [...PERMISSIONS];
  const defaults = ROLE_DEFAULTS[user.role] ?? [];
  const extras = (user.extraPermissions ?? []).filter(isPermission);
  return [...new Set([...defaults, ...extras])];
}

export function hasPermission(user: PermUser, p: Permission): boolean {
  return user.role === 'admin' || effectivePermissions(user).includes(p);
}
