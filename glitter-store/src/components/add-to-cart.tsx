'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
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
function colorName(v: { color: string | null }) {
    return isHexLike(v.color) ? '' : (v.color ?? '');
}

function variantLabel(v: ProductVariant): string {
    return [v.size, colorName(v) || v.color]
        .filter(Boolean)
        .join(' · ') || v.variantSku;
}

export function AddToCart({ product, lang }: { product: Product; lang: Lang }) {
    const { addItem } = useCart();
    const variants = product.variants ?? [];

    // Distinct sizes / colors across the variant matrix (order preserved).
    const sizes = [
        ...new Set(variants.map((v) => v.size).filter(Boolean) as string[]),
    ];
    const colors: { key: string; name: string; hex: string }[] = [];
    for (const v of variants) {
        if (!v.color) continue;
        if (colors.some((c) => c.key === v.color)) continue;
        colors.push({
            key: v.color,
            name: colorName(v),
            hex: swatchColor(v),
        });
    }
    const hasSizes = sizes.length > 0;
    const hasColors = colors.length > 0;

    const firstInStock = variants.find((v) => v.quantityInStock > 0) ?? variants[0];
    const [size, setSize] = useState<string | null>(
        hasSizes ? firstInStock?.size ?? null : null,
    );
    const [color, setColor] = useState<string | null>(
        hasColors ? firstInStock?.color ?? null : null,
    );
    const [qty, setQty] = useState(1);
    const [error, setError] = useState('');
    const [added, setAdded] = useState(false);

    // Resolve the concrete variant from the current size/color picks.
    const selected =
        variants.find(
            (v) =>
                (!hasSizes || v.size === size) &&
                (!hasColors || v.color === color),
        ) ?? (!hasSizes && !hasColors ? firstInStock : undefined);

    const price = selected?.effectivePrice ?? product.price;
    const maxQty = selected?.quantityInStock ?? 0;

    // Size is the primary axis — always show every size. Colors are shown for
    // the currently selected size (or all colors when the product has no size).
    const displayedSizes = sizes;
    const displayedColors = colors.filter((c) =>
        variants.some(
            (v) =>
                v.color === c.key &&
                (!hasSizes || size == null || v.size === size),
        ),
    );

    // A size is available if any of its variants is in stock (any color).
    const sizeInStock = (s: string) =>
        variants.some((v) => v.size === s && v.quantityInStock > 0);
    const colorInStock = (c: string) =>
        variants.some(
            (v) =>
                v.color === c &&
                (!hasSizes || size == null || v.size === size) &&
                v.quantityInStock > 0,
        );

    // Pick a size, keeping the color valid (prefer an in-stock pairing).
    function pickSize(s: string) {
        setError('');
        setSize(s);
        if (hasColors && !variants.some((v) => v.size === s && v.color === color)) {
            const match =
                variants.find((v) => v.size === s && v.quantityInStock > 0) ??
                variants.find((v) => v.size === s);
            setColor(match?.color ?? null);
        }
    }
    // Color doesn't constrain size — size drives which colors are shown.
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
                variantLabel: variantLabel(selected),
                colorHex: selected.colorHex,
                unitPrice: price,
            },
            Math.min(qty, maxQty || qty),
        );
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2500);
    }

    const selectedColorName = colors.find((c) => c.key === color)?.name;
    const canAdd = !!selected && selected.quantityInStock > 0;

    return (
        <div className="mt-6 space-y-5">
            {/* Size */}
            {hasSizes && (
                <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'size')}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {displayedSizes.map((s) => {
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
                                            'cursor-not-allowed border-zinc-100 text-zinc-300 line-through hover:border-zinc-100 hover:text-zinc-300 dark:border-zinc-800 dark:text-zinc-600 dark:hover:border-zinc-800',
                                    )}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Color */}
            {hasColors && (
                <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'color')}
                        {selectedColorName && (
                            <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                                {selectedColorName}
                            </span>
                        )}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2.5">
                        {displayedColors.map((c) => {
                            const active = c.key === color;
                            const oos = !colorInStock(c.key);
                            return (
                                <button
                                    key={c.key}
                                    type="button"
                                    title={c.name || undefined}
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

            {/* Quantity + add to cart */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
                    <button
                        type="button"
                        aria-label="-"
                        disabled={qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="flex size-11 items-center justify-center text-lg text-zinc-600 disabled:opacity-40 dark:text-zinc-300"
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
                            setQty((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))
                        }
                        className="flex size-11 items-center justify-center text-lg text-zinc-600 disabled:opacity-40 dark:text-zinc-300"
                    >
                        +
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 rounded-full bg-(--brand) px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:opacity-90 active:scale-[0.99] sm:flex-none sm:px-12"
                >
                    {added ? tr(lang, 'added') : tr(lang, 'addToCart')}
                </button>
            </div>

            {error && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
            {added && (
                <p className="text-sm font-medium text-emerald-600">
                    {tr(lang, 'added')} ·{' '}
                    <Link href="/checkout" className="underline">
                        {tr(lang, 'viewCart')}
                    </Link>
                </p>
            )}
        </div>
    );
}
