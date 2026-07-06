'use client';

import { useRouter } from 'next/navigation';
import { useWishlist } from '@/lib/wishlist';

export function WishlistButton({
    productId,
    className,
    size = 'sm',
}: {
    productId: string;
    className?: string;
    size?: 'sm' | 'lg';
}) {
    const router = useRouter();
    const { has, toggle } = useWishlist();
    const saved = has(productId);

    async function onClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Optimistic + ref-based — safe to fire on every click (no lock).
        const result = await toggle(productId);
        if (result === 'guest') router.push('/account/login');
    }

    const box = size === 'lg' ? 'size-11' : 'size-8';
    const icon = size === 'lg' ? 'size-5' : 'size-4';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="wishlist"
            aria-pressed={saved}
            className={`flex ${box} items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110 active:scale-95 ${
                className ?? ''
            }`}
        >
            <svg
                viewBox="0 0 24 24"
                className={`${icon} transition-colors ${
                    saved ? 'text-(--brand)' : 'text-zinc-500 dark:text-zinc-400'
                }`}
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    );
}
