'use client';

import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { fileUrl, formatPrice } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { BackLink } from '@/components/ui/back-link';
import { pick, tr, type Lang } from '@/lib/locale';

export function CartView({ lang }: { lang: Lang }) {
    const { items, hydrated, subtotal, itemCount, updateQty, removeItem } =
        useCart();

    if (!hydrated) {
        return <div className="mx-auto max-w-5xl px-4 py-16" />;
    }

    if (items.length === 0) {
        return (
            <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center">
                <span className="flex size-20 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                    <ShoppingBag className="size-9" />
                </span>
                <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'cartEmpty')}
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'cartEmptyHelp')}
                </p>
                <Link
                    href="/products"
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90"
                >
                    {tr(lang, 'continueShopping')}
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
            <BackLink lang={lang} fallbackHref="/products" className="mb-3" />
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'cart')}
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {itemCount}
                </span>
            </h1>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Items */}
                <ul className="space-y-3">
                    {items.map((item) => {
                        const img = fileUrl(item.image);
                        const name = pick(lang, item.nameEn, item.nameKm);
                        return (
                            <li
                                key={item.variantId}
                                className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <Link
                                    href={`/products/${item.slug}`}
                                    className="size-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                                >
                                    {img && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={img}
                                            alt={name}
                                            className="size-full object-cover transition-transform hover:scale-105"
                                        />
                                    )}
                                </Link>

                                <div className="flex min-w-0 flex-1 flex-col">
                                    <div className="flex items-start justify-between gap-2">
                                        <Link
                                            href={`/products/${item.slug}`}
                                            className="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors hover:text-(--brand) dark:text-zinc-100"
                                        >
                                            {name}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeItem(item.variantId)
                                            }
                                            aria-label={tr(lang, 'remove')}
                                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                    {item.variantLabel && (
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {item.variantLabel}
                                        </p>
                                    )}

                                    <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                                        <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700">
                                            <button
                                                type="button"
                                                aria-label="-"
                                                onClick={() =>
                                                    updateQty(
                                                        item.variantId,
                                                        item.quantity - 1,
                                                    )
                                                }
                                                className="flex size-8 items-center justify-center text-zinc-600 hover:text-(--brand) dark:text-zinc-300"
                                            >
                                                <Minus className="size-3.5" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-semibold tabular-nums">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label="+"
                                                onClick={() =>
                                                    updateQty(
                                                        item.variantId,
                                                        item.quantity + 1,
                                                    )
                                                }
                                                className="flex size-8 items-center justify-center text-zinc-600 hover:text-(--brand) dark:text-zinc-300"
                                            >
                                                <Plus className="size-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatPrice(
                                                    item.unitPrice *
                                                        item.quantity,
                                                )}
                                            </p>
                                            {item.quantity > 1 && (
                                                <p className="text-[11px] text-zinc-400">
                                                    {formatPrice(item.unitPrice)}{' '}
                                                    {tr(lang, 'each')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {/* Summary */}
                <div className="lg:sticky lg:top-24 lg:h-fit">
                    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'orderSummary')}
                        </h2>
                        <div className="mt-4 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'subtotal')}
                                </span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(subtotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'delivery')}
                                </span>
                                <span className="text-xs text-zinc-400">
                                    {tr(lang, 'calculatedAtCheckout')}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {tr(lang, 'total')}
                            </span>
                            <span className="text-lg font-extrabold text-(--brand)">
                                {formatPrice(subtotal)}
                            </span>
                        </div>

                        <Link
                            href="/checkout"
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90"
                        >
                            {tr(lang, 'proceedCheckout')}
                            <ArrowRight className="size-4" />
                        </Link>
                        <Link
                            href="/products"
                            className="mt-3 flex w-full items-center justify-center text-sm text-zinc-500 transition-colors hover:text-(--brand) dark:text-zinc-400"
                        >
                            {tr(lang, 'continueShopping')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
