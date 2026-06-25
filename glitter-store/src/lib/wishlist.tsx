'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import type { Product } from '@/lib/types';

interface WishlistContextValue {
    products: Product[];
    loading: boolean;
    has: (productId: string) => boolean;
    /** Returns 'guest' if not logged in (caller should send them to login). */
    toggle: (productId: string) => Promise<'guest' | 'ok'>;
    refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { user, authFetch } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!user) {
            setProducts([]);
            setSavedIds(new Set());
            return;
        }
        try {
            const res = await authFetch('/api/account/wishlist');
            if (res.ok) {
                const d = (await res.json()) as { data?: Product[] };
                const list = d.data ?? [];
                setProducts(list);
                setSavedIds(new Set(list.map((p) => p.id)));
            }
        } catch {
            // ignore
        }
    }, [user, authFetch]);

    useEffect(() => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    }, [refresh]);

    const has = useCallback(
        (productId: string) => savedIds.has(productId),
        [savedIds],
    );

    const toggle = useCallback(
        async (productId: string): Promise<'guest' | 'ok'> => {
            if (!user) return 'guest';
            const saved = savedIds.has(productId);
            // optimistic
            setSavedIds((prev) => {
                const next = new Set(prev);
                if (saved) next.delete(productId);
                else next.add(productId);
                return next;
            });
            try {
                if (saved) {
                    await authFetch(`/api/account/wishlist/${productId}`, {
                        method: 'DELETE',
                    });
                } else {
                    await authFetch('/api/account/wishlist', {
                        method: 'POST',
                        body: JSON.stringify({ productId }),
                    });
                }
                void refresh();
            } catch {
                // revert
                setSavedIds((prev) => {
                    const next = new Set(prev);
                    if (saved) next.add(productId);
                    else next.delete(productId);
                    return next;
                });
            }
            return 'ok';
        },
        [user, savedIds, authFetch, refresh],
    );

    return (
        <WishlistContext.Provider
            value={{ products, loading, has, toggle, refresh }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist(): WishlistContextValue {
    const ctx = useContext(WishlistContext);
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
    return ctx;
}
