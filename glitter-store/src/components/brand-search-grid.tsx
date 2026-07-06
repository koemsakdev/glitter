'use client';

import Link from 'next/link';
import { Search, SearchX, ArrowRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface BrandCardData {
    id: string;
    name: string;
    logo: string | null;
}

/** Client-side searchable grid of brands. Filtering is instant (small list). */
export function BrandSearchGrid({
    brands,
    labels,
}: {
    brands: BrandCardData[];
    labels: {
        search: string;
        empty: string;
        viewProducts: string;
    };
}) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return brands;
        return brands.filter((b) => b.name.toLowerCase().includes(q));
    }, [brands, query]);

    return (
        <div className="mt-8">
            {/* Search */}
            <div className="relative mx-auto max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={labels.search}
                    className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-11 pr-10 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-900 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
                    <SearchX className="size-10 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">
                        {labels.empty}
                    </p>
                    {query && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            “{query}”
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {filtered.map((b) => (
                        <Link
                            key={b.id}
                            href={`/products?brandIds=${b.id}`}
                            className="group flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-(--brand)/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-zinc-50 ring-1 ring-zinc-100 dark:bg-zinc-800 dark:ring-zinc-700">
                                {b.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={b.logo}
                                        alt={b.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-(--brand)">
                                        {b.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">
                                {b.name}
                            </span>
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-(--brand) opacity-0 transition-opacity group-hover:opacity-100">
                                {labels.viewProducts}
                                <ArrowRight className="size-3.5" />
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
