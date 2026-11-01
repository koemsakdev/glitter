'use client';

import Link from 'next/link';
import { ArrowRight, Home, ShoppingBag } from 'lucide-react';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

/** 404 content — follows the language switch instantly. */
export function NotFoundView({ lang: initialLang }: { lang: Lang }) {
    const { lang } = useLang(initialLang);
    return (
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
            <div className="relative select-none">
                <p className="bg-linear-to-b from-(--brand) to-(--brand)/30 bg-clip-text text-[7.5rem] font-black leading-none tracking-tighter text-transparent sm:text-[9rem]">
                    404
                </p>
                <span className="absolute -right-3 top-3 flex size-12 rotate-12 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
                    <ShoppingBag className="size-6 text-(--brand)" />
                </span>
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {tr(lang, 'nf404')}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, 'nf404Body')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90"
                >
                    <Home className="size-4" />
                    {tr(lang, 'nfHome')}
                </Link>
                <Link
                    href="/products"
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                    {tr(lang, 'nfShop')}
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </div>
    );
}
