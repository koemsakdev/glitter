'use client';

import Link from 'next/link';
import { fileUrl, formatPrice } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { pick, tr, type Lang } from '@/lib/locale';

export function CartView({ lang }: { lang: Lang }) {
    const { items, hydrated, subtotal, updateQty, removeItem } = useCart();

    if (!hydrated) {
        return <div className="mx-auto max-w-5xl px-4 py-16" />;
    }

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'cart')}
                </h1>
                <p className="mt-3 text-zinc-600 dark:text-zinc-300">{tr(lang, 'cartEmpty')}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'cartEmptyHelp')}
                </p>
                <Link
                    href="/products"
                    className="mt-6 inline-flex rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                    {tr(lang, 'continueShopping')}
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'cart')}
            </h1>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Items */}
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {items.map((item) => {
                        const img = fileUrl(item.image);
                        const name = pick(lang, item.nameEn, item.nameKm);
                        return (
                            <li
                                key={item.variantId}
                                className="flex gap-4 p-4"
                            >
                                <Link
                                    href={`/products/${item.slug}`}
                                    className="size-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
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

                                <div className="flex min-w-0 flex-1 flex-col">
                                    <Link
                                        href={`/products/${item.slug}`}
                                        className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-(--brand)"
                                    >
                                        {name}
                                    </Link>
                                    {item.variantLabel && (
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {item.variantLabel}
                                        </p>
                                    )}
                                    <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(item.unitPrice)}
                                    </p>

                                    <div className="mt-auto flex items-center gap-3 pt-2">
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
                                                className="flex size-8 items-center justify-center text-zinc-600 dark:text-zinc-300"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center text-sm tabular-nums">
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
                                                className="flex size-8 items-center justify-center text-zinc-600 dark:text-zinc-300"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeItem(item.variantId)
                                            }
                                            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600"
                                        >
                                            {tr(lang, 'remove')}
                                        </button>
                                    </div>
                                </div>

                                <div className="shrink-0 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(item.unitPrice * item.quantity)}
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {/* Summary */}
                <div className="h-fit rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-300">
                            {tr(lang, 'subtotal')}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatPrice(subtotal)}
                        </span>
                    </div>
                    <Link
                        href="/checkout"
                        className="mt-5 flex w-full items-center justify-center rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                        {tr(lang, 'proceedCheckout')}
                    </Link>
                    <Link
                        href="/products"
                        className="mt-3 flex w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-(--brand)"
                    >
                        {tr(lang, 'continueShopping')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
