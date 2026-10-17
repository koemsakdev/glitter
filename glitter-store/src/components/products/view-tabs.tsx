'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Flame, LayoutGrid, PackagePlus, type LucideIcon } from 'lucide-react';
import { NavLoadingBar } from '@/components/nav-loading-bar';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

const TABS: { view: string; trKey: string; icon: LucideIcon; href: string }[] =
    [
        {
            view: '',
            trKey: 'allProducts',
            icon: LayoutGrid,
            href: '/products',
        },
        {
            view: 'new-arrivals',
            trKey: 'newArrivals',
            icon: PackagePlus,
            href: '/products?view=new-arrivals',
        },
        {
            view: 'best-selling',
            trKey: 'bestSellers',
            icon: Flame,
            href: '/products?view=best-selling',
        },
    ];

/**
 * Segmented switch between the shop's main lists — the same targets the home
 * sections' "View all" buttons open. Highlights the tapped tab immediately
 * while the list loads.
 */
export function ViewTabs({
    active,
    lang: initialLang,
}: {
    active: string;
    lang: Lang;
}) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [target, setTarget] = useState(active);
    const shown = isPending ? target : active;

    return (
        <>
            {isPending && <NavLoadingBar />}
            <div
                role="tablist"
                className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 shadow-sm scrollbar-none dark:border-zinc-700 dark:bg-zinc-900 [&::-webkit-scrollbar]:hidden"
            >
                {TABS.map((t) => {
                    const on = shown === t.view;
                    return (
                        <button
                            key={t.view || 'all'}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onMouseEnter={() => router.prefetch(t.href)}
                            onClick={() => {
                                if (t.view === active) return;
                                setTarget(t.view);
                                startTransition(() => router.push(t.href));
                            }}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all',
                                on
                                    ? 'bg-(--brand) text-white shadow-md shadow-(--brand)/25'
                                    : 'text-zinc-600 hover:text-(--brand) dark:text-zinc-300',
                            )}
                        >
                            <t.icon className="size-4" />
                            {tr(lang, t.trKey)}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
