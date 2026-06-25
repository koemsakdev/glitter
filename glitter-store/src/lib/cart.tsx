'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

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
    addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
    updateQty: (variantId: string, qty: number) => void;
    removeItem: (variantId: string) => void;
    clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'glitter_cart';

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (raw) setItems(JSON.parse(raw) as CartItem[]);
        } catch {
            // ignore malformed storage
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // storage may be unavailable
        }
    }, [items, hydrated]);

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
