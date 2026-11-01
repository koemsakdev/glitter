'use client';

import { useSyncExternalStore } from 'react';
import { formatPrice } from '@/lib/api';

/**
 * The price of the size / colour currently picked on a product page.
 * AddToCart writes it, ProductPrice (near the title) reads it — they sit in
 * different parts of the server-rendered page, so a tiny shared store links
 * them instead of a provider.
 */
const picked = new Map<string, number>();
const listeners = new Set<() => void>();

export function setPickedPrice(productId: string, price: number | null) {
    if (price === null) picked.delete(productId);
    else if (picked.get(productId) === price) return;
    else picked.set(productId, price);
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function ProductPrice({
    productId,
    price,
    originalPrice,
}: {
    productId: string;
    /** The product's selling price (shown until a variant is picked). */
    price: number;
    originalPrice: number | null;
}) {
    const current = useSyncExternalStore(
        subscribe,
        () => picked.get(productId) ?? price,
        () => price,
    );
    const before = originalPrice ?? 0;
    const onSale = before > current;
    const pct = onSale ? Math.round((1 - current / before) * 100) : 0;

    return (
        <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-(--brand)">
                {formatPrice(current)}
            </span>
            {onSale && (
                <>
                    <span className="text-lg text-zinc-400 line-through">
                        {formatPrice(before)}
                    </span>
                    <span className="rounded-full bg-(--brand)/10 px-2 py-0.5 text-sm font-bold text-(--brand)">
                        -{pct}%
                    </span>
                </>
            )}
        </div>
    );
}
