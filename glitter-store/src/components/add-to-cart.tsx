'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

function variantLabel(v: {
    size: string | null;
    color: string | null;
    variantSku: string;
}): string {
    return [v.size, v.color].filter(Boolean).join(' · ') || v.variantSku;
}

export function AddToCart({ product, lang }: { product: Product; lang: Lang }) {
    const { addItem } = useCart();
    const variants = product.variants ?? [];
    const firstInStock = variants.find((v) => v.quantityInStock > 0);
    const [selectedId, setSelectedId] = useState(
        (firstInStock ?? variants[0])?.id ?? '',
    );
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    const selected = variants.find((v) => v.id === selectedId);
    const price = selected?.effectivePrice ?? product.price;
    const maxQty = selected?.quantityInStock ?? 0;
    const unavailable = !selected || maxQty <= 0;

    const primary =
        product.images?.find((i) => i.imageType === 'primary') ??
        product.images?.[0];

    function handleAdd() {
        if (!selected) return;
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
            qty,
        );
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2500);
    }

    return (
        <div className="mt-6 space-y-5">
            {variants.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'availableOptions')}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {variants.map((v) => {
                            const active = v.id === selectedId;
                            const oos = v.quantityInStock <= 0;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    disabled={oos}
                                    onClick={() => setSelectedId(v.id)}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                                        active
                                            ? 'border-(--brand) bg-pink-50 dark:bg-(--brand)/15 text-(--brand)'
                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-(--brand)',
                                        oos &&
                                            'cursor-not-allowed text-zinc-300 line-through hover:border-zinc-200 dark:border-zinc-700',
                                    )}
                                >
                                    {v.colorHex && (
                                        <span
                                            className="size-3.5 rounded-full border border-zinc-300"
                                            style={{ backgroundColor: v.colorHex }}
                                        />
                                    )}
                                    {variantLabel(v)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatPrice(price)}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
                    <button
                        type="button"
                        aria-label="-"
                        disabled={unavailable || qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="flex size-10 items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 disabled:opacity-40"
                    >
                        −
                    </button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">
                        {qty}
                    </span>
                    <button
                        type="button"
                        aria-label="+"
                        disabled={unavailable || qty >= maxQty}
                        onClick={() =>
                            setQty((q) => Math.min(maxQty || 1, q + 1))
                        }
                        className="flex size-10 items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 disabled:opacity-40"
                    >
                        +
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={unavailable}
                    className="rounded-full bg-(--brand) px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-10"
                >
                    {unavailable ? tr(lang, 'outOfStock') : tr(lang, 'addToCart')}
                </button>
            </div>

            {added && (
                <p className="text-sm font-medium text-emerald-600">
                    {tr(lang, 'added')} ·{' '}
                    <Link href="/cart" className="underline">
                        {tr(lang, 'viewCart')}
                    </Link>
                </p>
            )}
        </div>
    );
}
