'use client';

import Link from 'next/link';
import { QuickAddButton } from '@/components/quick-add-button';
import { WishlistButton } from '@/components/wishlist-button';
import { StarRating } from '@/components/ui/star-rating';
import { fileUrl, formatPrice } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { pick, tr, type Lang } from '@/lib/locale';
import type { Product } from '@/lib/types';

export function ProductCard({
    product,
    lang: initialLang,
}: {
    product: Product;
    lang: Lang;
}) {
    // Read from the language context so switching re-renders instantly (the
    // component is still server-rendered on first load, so SEO is preserved).
    const { lang } = useLang(initialLang);
    const name = pick(lang, product.nameEn, product.nameKm);
    const primary =
        product.images?.find((i) => i.imageType === 'primary') ??
        product.images?.[0];
    const img = fileUrl(primary?.imageUrl);
    const hasDiscount =
        product.originalPrice != null && product.originalPrice > product.price;
    const discountPct = hasDiscount
        ? Math.round((1 - product.price / (product.originalPrice as number)) * 100)
        : 0;
    const outOfStock = product.totalStock <= 0;

    // Show a single, clean badge: the product's first badge (admin-ordered).
    const firstBadge = product.badges?.[0];
    const firstBadgeLabel = firstBadge
        ? pick(lang, firstBadge.badgeLabelEn ?? '', firstBadge.badgeLabelKm ?? '')
        : '';
    const primaryBadge =
        firstBadge && firstBadgeLabel
            ? {
                  label: firstBadgeLabel,
                  color: firstBadge.badgeIconColor ?? '#64748b',
              }
            : null;

    // Colour options from the variants, each with its available sizes (shown on
    // hover) so shoppers can see choices without opening the product.
    const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const colorMap = new Map<
        string,
        { hex: string | null; name: string | null; sizes: string[] }
    >();
    for (const v of product.variants ?? []) {
        const key = v.colorHex ?? v.color;
        if (!key) continue;
        const entry = colorMap.get(key) ?? {
            hex: v.colorHex,
            name: v.color,
            sizes: [],
        };
        if (v.size && !entry.sizes.includes(v.size)) entry.sizes.push(v.size);
        colorMap.set(key, entry);
    }
    const colors = [...colorMap.values()].map((c) => ({
        ...c,
        sizes: [...c.sizes].sort((a, b) => {
            const ia = SIZE_ORDER.indexOf(a.toUpperCase());
            const ib = SIZE_ORDER.indexOf(b.toUpperCase());
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        }),
    }));
    const MAX_SWATCHES = 5;
    const shownColors = colors.slice(0, MAX_SWATCHES);
    const extraColors = colors.length - shownColors.length;

    return (
        <div className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-1">
            {/* Image block — radius synced from the dashboard appearance config */}
            <div className="relative aspect-square overflow-hidden rounded-(--ui-radius) bg-zinc-100 shadow-sm ring-1 ring-transparent transition-all duration-300 group-hover:shadow-xl group-hover:ring-(--brand)/25 dark:bg-zinc-800 dark:group-hover:shadow-black/40">
                    {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={img}
                            alt={name}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-zinc-300">
                            <svg
                                className="size-10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                            </svg>
                        </div>
                    )}

                    {/* Up to two badges — discount + the primary product badge.
                        Tinted via .product-badge so they adapt to light/dark. */}
                    <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
                        {hasDiscount && (
                            <span
                                style={
                                    {
                                        '--badge': 'var(--brand)',
                                    } as React.CSSProperties
                                }
                                className="product-badge rounded-full px-2.5 py-1 text-[10px] font-extrabold shadow-sm backdrop-blur-sm"
                            >
                                -{discountPct}%
                            </span>
                        )}
                        {primaryBadge && (
                            <span
                                style={
                                    {
                                        '--badge': primaryBadge.color,
                                    } as React.CSSProperties
                                }
                                className="product-badge rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm"
                            >
                                {primaryBadge.label}
                            </span>
                        )}
                    </div>
                    {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px] dark:bg-black/55">
                            <span className="rounded-full bg-zinc-900/85 px-3 py-1 text-[11px] font-medium text-white">
                                {tr(lang, 'soldOut')}
                            </span>
                        </div>
                    )}

                    {/* Click overlay for navigation */}
                    <Link
                        href={`/products/${product.slug}`}
                        aria-label={name}
                        className="absolute inset-0"
                    />

                    {/* Add-to-cart button (sits above the overlay) */}
                    {!outOfStock && (
                        <QuickAddButton
                            product={product}
                            lang={lang}
                            className="absolute bottom-2.5 right-2.5 z-10"
                        />
                    )}
                </div>

                {/* Name · rating · price */}
                <Link
                    href={`/products/${product.slug}`}
                    className="block px-1 pt-(--ui-pad)"
                >
                    <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 transition-colors group-hover:text-(--brand) dark:text-zinc-100">
                        {name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                        <StarRating value={product.averageRating} />
                        {product.reviewCount > 0 && (
                            <span className="text-[11px] text-zinc-400">
                                ({product.reviewCount})
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-(--brand)">
                            {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs text-zinc-400 line-through">
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                    </div>

                    {/* Colour options — hover a swatch to see that colour's sizes */}
                    {colors.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {shownColors.map((c, i) => (
                                <span
                                    key={i}
                                    className="group/sw relative inline-flex"
                                >
                                    <span
                                        className="block size-4 rounded-full border border-zinc-200 shadow-sm dark:border-zinc-600"
                                        style={{
                                            backgroundColor: c.hex ?? '#e4e4e7',
                                        }}
                                    />
                                    {c.sizes.length > 0 && (
                                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover/sw:block dark:bg-zinc-700">
                                            {tr(lang, 'sizeAvailable')}:{' '}
                                            {c.sizes.join(', ')}
                                        </span>
                                    )}
                                </span>
                            ))}
                            {extraColors > 0 && (
                                <span className="text-[10px] font-medium text-zinc-400">
                                    +{extraColors}
                                </span>
                            )}
                        </div>
                    )}
                </Link>

                <WishlistButton
                    productId={product.id}
                    className="absolute right-2 top-2 z-10"
                />
            </div>
    );
}
