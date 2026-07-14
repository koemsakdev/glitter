'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { ShoppingCart } from 'lucide-react';

export function CartButton({ label }: { label: string }) {
    const { itemCount, hydrated } = useCart();

    return (
        <Link
            href="/checkout"
            aria-label={label}
            title={label}
            className="relative flex size-9 items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 transition-colors hover:text-(--brand) h-9 w-9 border border-neutral-200 dark:border-neutral-800"
        >
            <ShoppingCart className="size-4" />
            {hydrated && itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                </span>
            )}
        </Link>
    );
}
