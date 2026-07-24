'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { WishlistButton } from '@/components/wishlist-button';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';

/**
 * Native-app style top bar for the product detail page on mobile: circular back
 * button (left), centred product title, and a cart (with live item count) +
 * wishlist toggle (right). Sticky to the top of the screen (the global store
 * header is hidden here on mobile), and hidden on desktop where the page keeps
 * its breadcrumb + two-column layout.
 */
export function ProductMobileAppBar({
    lang,
    title,
    productId,
}: {
    lang: Lang;
    title: string;
    productId: string;
}) {
    const { itemCount, hydrated } = useCart();

    return (
        <div className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-zinc-100/80 bg-white/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-xl md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/85">
            <BackLink lang={lang} useHistory />

            <h1 className="pointer-events-none absolute left-1/2 max-w-[42%] -translate-x-1/2 truncate text-center text-base font-bold text-zinc-900 dark:text-zinc-50">
                {title}
            </h1>

            <div className="flex items-center gap-2">
                {/* Cart shortcut with a live item-count badge */}
                <Link
                    href="/checkout"
                    aria-label={tr(lang, 'cart')}
                    className="relative flex size-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 transition-colors hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                    <ShoppingCart className="size-5" />
                    {hydrated && itemCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
                            {itemCount > 99 ? '99+' : itemCount}
                        </span>
                    )}
                </Link>

                <WishlistButton
                    productId={productId}
                    size="lg"
                    className="border border-zinc-200/80 dark:border-zinc-700"
                />
            </div>
        </div>
    );
}
