'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function CartButton({ label }: { label: string }) {
    const { itemCount, hydrated } = useCart();

    return (
        <Link
            href="/cart"
            aria-label={label}
            title={label}
            className="relative flex size-9 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 transition-colors hover:text-(--brand)"
        >
            <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {hydrated && itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                </span>
            )}
        </Link>
    );
}
