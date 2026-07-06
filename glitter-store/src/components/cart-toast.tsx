'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { fileUrl, formatPrice } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { pick, tr, type Lang } from '@/lib/locale';

export function CartToast({ lang }: { lang: Lang }) {
    const { lastAdded } = useCart();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!lastAdded) return;
        setShow(true);
        const t = setTimeout(() => setShow(false), 3500);
        return () => clearTimeout(t);
    }, [lastAdded]);

    if (!lastAdded) return null;

    const { item } = lastAdded;
    const name = pick(lang, item.nameEn, item.nameKm);
    const img = fileUrl(item.image);

    return (
        <div
            className={`fixed inset-x-0 bottom-20 z-60 flex justify-center px-4 transition-all duration-300 sm:bottom-6 ${
                show
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none translate-y-3 opacity-0'
            }`}
        >
            <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-5" />
                </span>
                {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={img}
                        alt=""
                        className="size-11 shrink-0 rounded-lg object-cover"
                    />
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {tr(lang, 'added')}
                    </p>
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {name}
                    </p>
                    {item.variantLabel && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {item.variantLabel} · {formatPrice(item.unitPrice)}
                        </p>
                    )}
                </div>
                <Link
                    href="/cart"
                    onClick={() => setShow(false)}
                    className="shrink-0 rounded-full bg-(--brand) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                    {tr(lang, 'viewCart')}
                </Link>
                <button
                    type="button"
                    onClick={() => setShow(false)}
                    aria-label="Close"
                    className="shrink-0 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
