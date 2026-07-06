'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { Handbag } from 'lucide-react';

/**
 * Circular "+" quick-add on a product card. Adds the first in-stock variant
 * straight to the cart (for products with options, customers can still open
 * the detail page to choose). Lives as a sibling of the card's link so it
 * isn't a button nested inside an anchor.
 */
export function QuickAddButton({
    product,
    lang,
    className,
}: {
    product: Product;
    lang: Lang;
    className?: string;
}) {
    const { addItem, items } = useCart();
    const [added, setAdded] = useState(false);

    const variants = product.variants ?? [];
    const firstInStock = variants.find((v) => v.quantityInStock > 0) ?? null;
    const disabled = !firstInStock;

    // How many of this product are currently in the cart (across its variants).
    const cartQty = items
        .filter((x) => x.productId === product.id)
        .reduce((sum, x) => sum + x.quantity, 0);

    const primary =
        product.images?.find((i) => i.imageType === 'primary') ??
        product.images?.[0];

    function handleClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!firstInStock) return;
        addItem(
            {
                variantId: firstInStock.id,
                productId: product.id,
                slug: product.slug,
                nameEn: product.nameEn,
                nameKm: product.nameKm,
                image: primary?.imageUrl ?? '',
                variantLabel:
                    [firstInStock.size, firstInStock.color]
                        .filter(Boolean)
                        .join(' · ') || firstInStock.variantSku,
                colorHex: firstInStock.colorHex,
                unitPrice: firstInStock.effectivePrice ?? product.price,
            },
            1,
        );
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1500);
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            aria-label={tr(lang, 'addToCart')}
            className={cn(
                'relative flex size-9 items-center justify-center rounded-full text-white shadow-md transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 backdrop-blur-2xl',
                added ? 'bg-emerald-500/75' : 'bg-(--brand)/75 hover:opacity-90',
                className,
            )}
        >
            {cartQty > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-(--brand) shadow ring-1 ring-(--brand)/20 dark:bg-zinc-900 dark:ring-(--brand)/40">
                    {cartQty}
                </span>
            )}
            {added ? (
                <svg
                    className="size-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            ) : (
                // <svg
                //     className="size-5"
                //     viewBox="0 0 24 24"
                //     fill="none"
                //     stroke="currentColor"
                //     strokeWidth="2.5"
                //     strokeLinecap="round"
                //     strokeLinejoin="round"
                // >
                //     <path d="M12 5v14M5 12h14" />
                // </svg>

                <Handbag className='size-5' />
            )}
        </button>
    );
}
