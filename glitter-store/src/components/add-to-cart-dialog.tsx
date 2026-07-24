'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { fileUrl, formatPrice } from '@/lib/api';
import { colorLabel, pick, tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { StarRating } from '@/components/ui/star-rating';
import type { Product, ProductVariant } from '@/lib/types';

/** A color string that's really a hex code shouldn't be shown to customers. */
function isHexLike(s: string | null): boolean {
    return !!s && /^#?[0-9a-fA-F]{3,8}$/.test(s.trim());
}
function swatchColor(v: { color: string | null; colorHex: string | null }) {
    if (v.colorHex) return v.colorHex;
    if (isHexLike(v.color)) {
        const c = (v.color as string).trim();
        return c.startsWith('#') ? c : `#${c}`;
    }
    return '#d4d4d8';
}
/** Raw colour name (blank when the value is just a hex code). */
function colorName(v: { color: string | null }) {
    return isHexLike(v.color) ? '' : (v.color ?? '');
}
function variantLabel(lang: Lang, v: ProductVariant): string {
    const color = colorLabel(lang, colorName(v)) || v.color;
    return [v.size, color].filter(Boolean).join(' · ') || v.variantSku;
}

/**
 * Quick-add dialog: a compact version of the product detail page so the
 * customer sees the same information (image, rating, price, stock, description)
 * and must pick a size/color before it's added to the cart. Opened from a
 * product card's add button (see QuickAddButton). Drawer on mobile, dialog on
 * desktop — the shared ResponsiveModal.
 */
export function AddToCartDialog({
    product,
    lang,
    open,
    onOpenChange,
}: {
    product: Product;
    lang: Lang;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { addItem } = useCart();
    const variants = product.variants ?? [];

    const sizes = [
        ...new Set(variants.map((v) => v.size).filter(Boolean) as string[]),
    ];
    const colors: { key: string; name: string; hex: string }[] = [];
    for (const v of variants) {
        if (!v.color) continue;
        if (colors.some((c) => c.key === v.color)) continue;
        colors.push({ key: v.color, name: colorName(v), hex: swatchColor(v) });
    }
    const hasSizes = sizes.length > 0;
    const hasColors = colors.length > 0;

    const firstInStock =
        variants.find((v) => v.quantityInStock > 0) ?? variants[0];
    // Default to the first available variant (same as the detail page), so the
    // customer sees a valid pick they can then change.
    const [size, setSize] = useState<string | null>(
        hasSizes ? firstInStock?.size ?? null : null,
    );
    const [color, setColor] = useState<string | null>(
        hasColors ? firstInStock?.color ?? null : null,
    );
    const [qty, setQty] = useState(1);
    const [error, setError] = useState('');

    const selected =
        variants.find(
            (v) =>
                (!hasSizes || v.size === size) &&
                (!hasColors || v.color === color),
        ) ?? (!hasSizes && !hasColors ? firstInStock : undefined);

    const price = selected?.effectivePrice ?? product.price;
    const maxQty = selected?.quantityInStock ?? 0;
    const canAdd = !!selected && selected.quantityInStock > 0;

    const displayedColors = colors.filter((c) =>
        variants.some(
            (v) =>
                v.color === c.key &&
                (!hasSizes || size == null || v.size === size),
        ),
    );
    const sizeInStock = (s: string) =>
        variants.some((v) => v.size === s && v.quantityInStock > 0);
    const colorInStock = (c: string) =>
        variants.some(
            (v) =>
                v.color === c &&
                (!hasSizes || size == null || v.size === size) &&
                v.quantityInStock > 0,
        );

    function pickSize(s: string) {
        setError('');
        setSize(s);
        if (
            hasColors &&
            color &&
            !variants.some((v) => v.size === s && v.color === color)
        ) {
            const match =
                variants.find((v) => v.size === s && v.quantityInStock > 0) ??
                variants.find((v) => v.size === s);
            setColor(match?.color ?? null);
        }
    }
    function pickColor(c: string) {
        setError('');
        setColor(c);
    }

    function handleAdd() {
        setError('');
        if (hasSizes && !size) return setError(tr(lang, 'selectSize'));
        if (hasColors && !color) return setError(tr(lang, 'selectColor'));
        if (!selected || selected.quantityInStock <= 0)
            return setError(tr(lang, 'outOfStock'));

        const primary =
            product.images?.find((i) => i.imageType === 'primary') ??
            product.images?.[0];
        addItem(
            {
                variantId: selected.id,
                productId: product.id,
                slug: product.slug,
                nameEn: product.nameEn,
                nameKm: product.nameKm,
                image: primary?.imageUrl ?? '',
                variantLabel: variantLabel(lang, selected),
                colorHex: selected.colorHex,
                unitPrice: price,
            },
            Math.min(qty, maxQty || qty),
        );
        onOpenChange(false);
    }

    const primary =
        product.images?.find((i) => i.imageType === 'primary') ??
        product.images?.[0];
    const img = fileUrl(primary?.imageUrl ?? '');
    const name = pick(lang, product.nameEn, product.nameKm);
    const secondaryName = lang === 'km' ? product.nameEn : product.nameKm;
    const description = pick(
        lang,
        product.descriptionEn ?? '',
        product.descriptionKm ?? '',
    );
    const selectedColorName = colorLabel(
        lang,
        colors.find((c) => c.key === color)?.name,
    );
    const inStock = product.totalStock > 0;
    const hasDiscount =
        product.originalPrice != null && product.originalPrice > price;
    const discountPct = hasDiscount
        ? Math.round((1 - price / (product.originalPrice as number)) * 100)
        : 0;

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title={name}
            className="md:max-w-lg"
        >
            <div className="flex max-h-[86vh] flex-col md:max-h-[85vh]">
                {/* Scrollable content — mirrors the product detail page */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {/* Header: image + key facts */}
                    <div className="flex gap-4 px-5 pb-4 pt-5">
                        <Link
                            href={`/products/${product.slug}`}
                            className="size-28 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800"
                        >
                            {img && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={img}
                                    alt={name}
                                    className="size-full object-cover"
                                />
                            )}
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link
                                href={`/products/${product.slug}`}
                                className="line-clamp-2 text-base font-bold leading-snug text-zinc-900 hover:text-(--brand) dark:text-zinc-100"
                            >
                                {name}
                            </Link>
                            {secondaryName && secondaryName !== name && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    {secondaryName}
                                </p>
                            )}

                            {/* Rating */}
                            <div className="mt-1.5 flex items-center gap-1.5">
                                {product.reviewCount === 0 ? (
                                    <span className="text-xs text-zinc-400">
                                        {tr(lang, 'noReviews')}
                                    </span>
                                ) : (
                                    <>
                                        <StarRating value={product.averageRating} />
                                        <span className="text-xs text-zinc-400">
                                            ({product.reviewCount})
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Price */}
                            <div className="mt-2 flex flex-wrap items-baseline gap-2">
                                <span className="text-xl font-extrabold text-(--brand)">
                                    {formatPrice(price)}
                                </span>
                                {hasDiscount && (
                                    <>
                                        <span className="text-sm text-zinc-400 line-through">
                                            {formatPrice(product.originalPrice)}
                                        </span>
                                        <span className="rounded-full bg-(--brand)/10 px-1.5 py-0.5 text-[11px] font-bold text-(--brand)">
                                            -{discountPct}%
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Stock */}
                            <div className="mt-2">
                                {inStock ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                        <span className="size-1.5 rounded-full bg-emerald-500" />
                                        {tr(lang, 'inStock')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                        {tr(lang, 'outOfStock')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {description && (
                        <p className="line-clamp-3 px-5 pb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {description}
                        </p>
                    )}

                    {/* Options */}
                    <div className="space-y-5 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                        {hasSizes && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {tr(lang, 'size')}
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {sizes.map((s) => {
                                        const active = s === size;
                                        const oos = !sizeInStock(s);
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => pickSize(s)}
                                                className={cn(
                                                    'flex min-w-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-95',
                                                    active
                                                        ? 'border-(--brand) bg-(--brand) text-white shadow-md shadow-(--brand)/25'
                                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
                                                    oos &&
                                                        'cursor-not-allowed border-zinc-100 text-zinc-300 line-through hover:border-zinc-100 hover:text-zinc-300 dark:border-zinc-800 dark:text-zinc-600',
                                                )}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {hasColors && (
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {tr(lang, 'color')}
                                    {selectedColorName && (
                                        <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                                            {selectedColorName}
                                        </span>
                                    )}
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-2.5">
                                    {displayedColors.map((c) => {
                                        const active = c.key === color;
                                        const oos = !colorInStock(c.key);
                                        return (
                                            <button
                                                key={c.key}
                                                type="button"
                                                title={
                                                    colorLabel(lang, c.name) ||
                                                    undefined
                                                }
                                                onClick={() => pickColor(c.key)}
                                                className={cn(
                                                    'relative flex size-9 items-center justify-center rounded-full border border-black/15 shadow-sm transition-all hover:scale-110 dark:border-white/30',
                                                    active &&
                                                        'ring-2 ring-(--brand) ring-offset-2 ring-offset-white dark:ring-offset-zinc-950',
                                                    oos && 'opacity-40',
                                                )}
                                                style={{ backgroundColor: c.hex }}
                                            >
                                                {active && (
                                                    <Check className="size-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]" />
                                                )}
                                                {oos && (
                                                    <span className="absolute h-px w-full rotate-45 bg-zinc-400" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        {/* SKU + link to the full page */}
                        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                            <span className="text-zinc-400">
                                SKU:{' '}
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                    {selected?.variantSku ?? product.sku}
                                </span>
                            </span>
                            <Link
                                href={`/products/${product.slug}`}
                                className="inline-flex items-center gap-1 font-semibold text-(--brand) hover:underline"
                            >
                                {tr(lang, 'viewDetails')}
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer: qty + add */}
                <div className="flex items-center gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
                        <button
                            type="button"
                            aria-label="-"
                            disabled={qty <= 1}
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            className="flex size-10 items-center justify-center text-lg text-zinc-600 disabled:opacity-40 dark:text-zinc-300"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                            {qty}
                        </span>
                        <button
                            type="button"
                            aria-label="+"
                            disabled={canAdd && qty >= maxQty}
                            onClick={() =>
                                setQty((q) =>
                                    maxQty ? Math.min(maxQty, q + 1) : q + 1,
                                )
                            }
                            className="flex size-10 items-center justify-center text-lg text-zinc-600 disabled:opacity-40 dark:text-zinc-300"
                        >
                            +
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!canAdd}
                        className="flex-1 rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {tr(lang, 'addToCart')}
                    </button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
