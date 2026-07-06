'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
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
    // Synchronous mirror of savedIds so rapid clicks read the latest value.
    const savedRef = useRef<Set<string>>(new Set());
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );

    function commitSaved(next: Set<string>) {
        savedRef.current = next;
        setSavedIds(next);
    }

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
                commitSaved(new Set(list.map((p) => p.id)));
            }
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Read the latest value from the ref (not a stale render closure),
            // so rapid add→remove clicks always flip the correct direction.
            const saved = savedRef.current.has(productId);
            const next = new Set(savedRef.current);
            if (saved) next.delete(productId);
            else next.add(productId);
            commitSaved(next); // instant, optimistic

            // Reflect removals in the wishlist list immediately too.
            if (saved) {
                setProducts((prev) => prev.filter((p) => p.id !== productId));
            }

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
                // Debounced resync — fires once after the clicks settle, so it
                // never races (and reverts) a rapid sequence of toggles.
                clearTimeout(refreshTimer.current);
                refreshTimer.current = setTimeout(() => void refresh(), 600);
            } catch {
                // revert this one operation
                const back = new Set(savedRef.current);
                if (saved) back.add(productId);
                else back.delete(productId);
                commitSaved(back);
            }
            return 'ok';
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, authFetch, refresh],
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
