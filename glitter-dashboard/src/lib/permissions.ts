'use client';

import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api';

/**
 * Permissions (mirror of the API's auth/permissions.ts). Admins have all of
 * them; managers/cashiers have their role's defaults plus whatever an admin
 * granted. The API is the real gate — this only shows/hides what people can use.
 */
export const PERMISSIONS = [
    'products.edit',
    'products.delete',
    'catalog.manage',
    'orders.refund',
    'inventory.manage',
    'promotions.manage',
    'customers.view',
    'reviews.moderate',
    'reviews.delete',
    'storefront.manage',
    'reports.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type PermUser = Pick<User, 'role'> & { permissions?: string[] };

export function userHasPermission(
    user: PermUser | null | undefined,
    p: Permission,
): boolean {
    if (!user) return false;
    return user.role === 'admin' || (user.permissions ?? []).includes(p);
}

/** Whether the signed-in user may do `p`. */
export function usePermission(p: Permission): boolean {
    return useAuthStore((s) => userHasPermission(s.user, p));
}

export function useIsAdmin(): boolean {
    return useAuthStore((s) => s.user?.role === 'admin');
}
