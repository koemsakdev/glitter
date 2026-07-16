'use client';

import { BackLink } from '@/components/ui/back-link';
import { WishlistButton } from '@/components/wishlist-button';
import type { Lang } from '@/lib/locale';

/**
 * Native-app style top bar for the product detail page on mobile: circular back
 * button (left), centred product title, and a wishlist toggle (right). Sticky to
 * the top of the screen (the global store header is hidden here on mobile), and
 * hidden on desktop where the page keeps its breadcrumb + two-column layout.
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
    return (
        <div className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-zinc-100/80 bg-white/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-xl md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/85">
            <BackLink lang={lang} />

            <h1 className="pointer-events-none absolute left-1/2 max-w-[52%] -translate-x-1/2 truncate text-center text-base font-bold text-zinc-900 dark:text-zinc-50">
                {title}
            </h1>

            <WishlistButton
                productId={productId}
                size="lg"
                className="border border-zinc-200/80 dark:border-zinc-700"
            />
        </div>
    );
}
