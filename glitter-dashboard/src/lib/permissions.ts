'use client';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Only admins manage the shared catalog (products, categories, brands,
 * colors, badges, promotions) and staff. Managers/cashiers view products and
 * work on their own branch. Mirrors the API's @Roles rules — the API is the
 * real gate; this only hides buttons people can't use.
 */
export function useIsAdmin(): boolean {
    return useAuthStore((s) => s.user?.role === 'admin');
}
