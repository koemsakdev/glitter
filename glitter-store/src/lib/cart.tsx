'use client';

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';

export interface CartItem {
    variantId: string;
    productId: string;
    slug: string;
    nameEn: string;
    nameKm: string;
    image: string; // raw served path
    variantLabel: string;
    colorHex: string | null;
    unitPrice: number;
    quantity: number;
}

interface CartContextValue {
    items: CartItem[];
    hydrated: boolean;
    itemCount: number;
    subtotal: number;
    /** The most recently added item (with a nonce so repeats re-trigger UI). */
    lastAdded: { item: CartItem; nonce: number } | null;
    addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
    updateQty: (variantId: string, qty: number) => void;
    removeItem: (variantId: string) => void;
    clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const KEY_PREFIX = 'glitter_cart';

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    // Each account (and the guest session) gets its own cart, so logging in or
    // out swaps to that identity's cart instead of sharing one global basket.
    const storageKey = user ? `${KEY_PREFIX}_${user.id}` : `${KEY_PREFIX}_guest`;

    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [lastAdded, setLastAdded] = useState<
        { item: CartItem; nonce: number } | null
    >(null);
    // Skip exactly one save right after the active cart key changes, so the
    // previous cart's items are never written into the new identity's slot.
    const savedKey = useRef<string | null>(null);

    // Load the cart whenever the identity (storage key) changes.
    useEffect(() => {
        let next: CartItem[] = [];
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) next = JSON.parse(raw) as CartItem[];
        } catch {
            // ignore malformed storage
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(next);
        setHydrated(true);
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated) return;
        if (savedKey.current !== storageKey) {
            // Identity just switched — don't persist the old items into the new
            // key; the load effect above is refreshing them for this key.
            savedKey.current = storageKey;
            return;
        }
        try {
            localStorage.setItem(storageKey, JSON.stringify(items));
        } catch {
            // storage may be unavailable
        }
    }, [items, hydrated, storageKey]);

    function addItem(item: Omit<CartItem, 'quantity'>, qty = 1) {
        setItems((prev) => {
            const i = prev.findIndex((x) => x.variantId === item.variantId);
            if (i >= 0) {
                const next = [...prev];
                next[i] = { ...next[i], quantity: next[i].quantity + qty };
                return next;
            }
            return [...prev, { ...item, quantity: qty }];
        });
        setLastAdded({ item: { ...item, quantity: qty }, nonce: Date.now() });
    }

    function updateQty(variantId: string, qty: number) {
        setItems((prev) =>
            qty <= 0
                ? prev.filter((x) => x.variantId !== variantId)
                : prev.map((x) =>
                      x.variantId === variantId ? { ...x, quantity: qty } : x,
                  ),
        );
    }

    function removeItem(variantId: string) {
        setItems((prev) => prev.filter((x) => x.variantId !== variantId));
    }

    function clear() {
        setItems([]);
    }

    const itemCount = items.reduce((sum, x) => sum + x.quantity, 0);
    const subtotal = items.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                hydrated,
                itemCount,
                subtotal,
                lastAdded,
                addItem,
                updateQty,
                removeItem,
                clear,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
