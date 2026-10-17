'use client';

import Link, { useLinkStatus } from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

type Item = number | 'gap-start' | 'gap-end';

/** 1 … 4 5 [6] 7 8 … 20 — always first/last, `siblings` around current. */
function pageItems(page: number, total: number, siblings: number): Item[] {
    const start = Math.max(2, page - siblings);
    const end = Math.min(total - 1, page + siblings);
    const items: Item[] = [1];
    if (start > 2) items.push(start === 3 ? 2 : 'gap-start');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push(end === total - 2 ? total - 1 : 'gap-end');
    if (total > 1) items.push(total);
    return items;
}

/** Spinner shown inside the clicked link until the next page has loaded. */
function PendingSpinner() {
    const { pending } = useLinkStatus();
    if (!pending) return null;
    return (
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-(--brand) text-white">
            <Loader2 className="size-4 animate-spin" />
        </span>
    );
}

/**
 * Numbered pagination for the product list. Real links (shareable URLs, back
 * button, crawlable) that Next prefetches, so moving between pages is quick.
 */
export function Pagination({
    page,
    totalPages,
    lang: initialLang,
}: {
    page: number;
    totalPages: number;
    lang: Lang;
}) {
    const { lang } = useLang(initialLang);
    const params = useSearchParams();
    if (totalPages <= 1) return null;

    const href = (n: number) => {
        const p = new URLSearchParams(params.toString());
        if (n > 1) p.set('page', String(n));
        else p.delete('page');
        const qs = p.toString();
        return qs ? `/products?${qs}` : '/products';
    };

    const cell =
        'relative inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-all duration-200';
    const idle =
        'text-zinc-600 hover:-translate-y-0.5 hover:bg-(--brand)/10 hover:text-(--brand) dark:text-zinc-300';
    const arrow =
        'relative inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold transition-all duration-200 sm:px-4';

    // Fewer numbers on phones so the bar never overflows.
    const desktop = pageItems(page, totalPages, 2);
    const mobile = new Set(pageItems(page, totalPages, 1).map(String));

    return (
        <nav
            aria-label={tr(lang, 'page')}
            className="mt-12 flex flex-col items-center gap-3"
        >
            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1.5 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
                {page > 1 ? (
                    <Link
                        href={href(page - 1)}
                        rel="prev"
                        className={cn(arrow, idle)}
                        aria-label={tr(lang, 'previous')}
                    >
                        <ChevronLeft className="size-4" />
                        <span className="max-sm:hidden">
                            {tr(lang, 'previous')}
                        </span>
                        <PendingSpinner />
                    </Link>
                ) : (
                    <span
                        aria-disabled
                        className={cn(
                            arrow,
                            'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                        )}
                    >
                        <ChevronLeft className="size-4" />
                        <span className="max-sm:hidden">
                            {tr(lang, 'previous')}
                        </span>
                    </span>
                )}

                <span className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

                {desktop.map((item) => {
                    const hideOnMobile = !mobile.has(String(item));
                    if (typeof item !== 'number') {
                        return (
                            <span
                                key={item}
                                aria-hidden
                                className={cn(
                                    'inline-flex size-10 items-center justify-center text-sm tracking-widest text-zinc-400',
                                    hideOnMobile && 'max-sm:hidden',
                                )}
                            >
                                ···
                            </span>
                        );
                    }
                    if (item === page) {
                        return (
                            <span
                                key={item}
                                aria-current="page"
                                className={cn(
                                    cell,
                                    'scale-105 bg-(--brand) text-white shadow-md shadow-(--brand)/40',
                                )}
                            >
                                {item}
                            </span>
                        );
                    }
                    return (
                        <Link
                            key={item}
                            href={href(item)}
                            className={cn(
                                cell,
                                idle,
                                hideOnMobile && 'max-sm:hidden',
                            )}
                        >
                            {item}
                            <PendingSpinner />
                        </Link>
                    );
                })}

                <span className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

                {page < totalPages ? (
                    <Link
                        href={href(page + 1)}
                        rel="next"
                        className={cn(
                            arrow,
                            'bg-(--brand)/10 text-(--brand) hover:-translate-y-0.5 hover:bg-(--brand) hover:text-white hover:shadow-md hover:shadow-(--brand)/30',
                        )}
                        aria-label={tr(lang, 'next')}
                    >
                        <span className="max-sm:hidden">
                            {tr(lang, 'next')}
                        </span>
                        <ChevronRight className="size-4" />
                        <PendingSpinner />
                    </Link>
                ) : (
                    <span
                        aria-disabled
                        className={cn(
                            arrow,
                            'cursor-not-allowed text-zinc-300 dark:text-zinc-600',
                        )}
                    >
                        <span className="max-sm:hidden">
                            {tr(lang, 'next')}
                        </span>
                        <ChevronRight className="size-4" />
                    </span>
                )}
            </div>

            {/* Small progress hint under the bar */}
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <span className="h-1 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <span
                        className="block h-full rounded-full bg-(--brand) transition-[width] duration-500"
                        style={{ width: `${(page / totalPages) * 100}%` }}
                    />
                </span>
                {tr(lang, 'page')} {page} {tr(lang, 'of')} {totalPages}
            </div>
        </nav>
    );
}
