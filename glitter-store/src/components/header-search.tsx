'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Package, Search, Star } from 'lucide-react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    fileUrl,
    formatPrice,
    getBestSellers,
    searchProducts,
    type SearchProduct,
} from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex min-w-4 items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] leading-none text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {children}
        </kbd>
    );
}

/** Normalize a full Product (SSR popular list) into the light search shape. */
function fromProduct(p: Product): SearchProduct {
    const primary =
        p.images?.find((i) => i.imageType === 'primary') ?? p.images?.[0];
    return {
        id: p.id,
        slug: p.slug,
        nameEn: p.nameEn,
        nameKm: p.nameKm,
        price: p.price,
        originalPrice: p.originalPrice,
        totalStock: p.totalStock,
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        imageUrl: primary?.imageUrl ?? null,
    };
}

export function HeaderSearch({
    lang,
    className = '',
    hotkey = false,
    initialPopular = [],
}: {
    lang: Lang;
    className?: string;
    hotkey?: boolean;
    /** Server-rendered popular products so the palette is instant on open. */
    initialPopular?: Product[];
}) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchProduct[]>([]);
    const [popular, setPopular] = React.useState<SearchProduct[]>(() =>
        initialPopular.map(fromProduct),
    );
    const [loading, setLoading] = React.useState(false);
    const seq = React.useRef(0);

    // ⌘K / Ctrl+K to open.
    React.useEffect(() => {
        if (!hotkey) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hotkey]);

    // Fallback: load popular client-side only if the server didn't provide it.
    React.useEffect(() => {
        if (open && popular.length === 0) {
            getBestSellers(20)
                .then((ps) => setPopular(ps.map(fromProduct)))
                .catch(() => {});
        }
    }, [open, popular.length]);

    // Live product search (debounced, with a stale-response guard).
    React.useEffect(() => {
        const q = query.trim();
        if (!q) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const id = ++seq.current;
        const t = setTimeout(() => {
            searchProducts(q, 12)
                .then((r) => {
                    if (id === seq.current) setResults(r);
                })
                .catch(() => {
                    if (id === seq.current) setResults([]);
                })
                .finally(() => {
                    if (id === seq.current) setLoading(false);
                });
        }, 220);
        return () => clearTimeout(t);
    }, [query]);

    function go(href: string) {
        setOpen(false);
        setQuery('');
        router.push(href);
    }

    const q = query.trim();
    const list = q ? results : popular;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={tr(lang, 'search')}
                title={tr(lang, 'search')}
                className={cn(
                    'flex size-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-(--brand) dark:text-zinc-300 dark:hover:bg-zinc-800',
                    className,
                )}
            >
                <Search className="size-5" />
            </button>

            <Dialog.Root
                open={open}
                onOpenChange={(v) => {
                    setOpen(v);
                    if (!v) setQuery('');
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
                    <Dialog.Content
                        className="fixed left-1/2 top-[10vh] z-50 w-[95vw] max-w-3xl -translate-x-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900"
                        aria-describedby={undefined}
                    >
                        <Dialog.Title className="sr-only">
                            {tr(lang, 'search')}
                        </Dialog.Title>

                        <Command shouldFilter={false} loop>
                            <CommandInput
                                value={query}
                                onValueChange={setQuery}
                                onClear={() => setQuery('')}
                                placeholder={tr(lang, 'search')}
                                autoFocus
                            />
                            <CommandList className="max-h-[62vh]">
                                {loading && list.length === 0 && (
                                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-zinc-400">
                                        <Loader2 className="size-6 animate-spin text-(--brand)" />
                                    </div>
                                )}

                                {!loading && q && results.length === 0 && (
                                    <CommandEmpty>
                                        {tr(lang, 'noProducts')}
                                    </CommandEmpty>
                                )}

                                {list.length > 0 && (
                                    <CommandGroup
                                        heading={
                                            q
                                                ? tr(lang, 'products')
                                                : tr(lang, 'popular')
                                        }
                                    >
                                        {list.map((p) => {
                                            const img = fileUrl(p.imageUrl);
                                            const hasDiscount =
                                                p.originalPrice != null &&
                                                Number(p.originalPrice) >
                                                    Number(p.price);
                                            const discountPct = hasDiscount
                                                ? Math.round(
                                                      (1 -
                                                          Number(p.price) /
                                                              Number(
                                                                  p.originalPrice,
                                                              )) *
                                                          100,
                                                  )
                                                : 0;
                                            const out = p.totalStock <= 0;
                                            return (
                                                <CommandItem
                                                    key={p.id}
                                                    value={p.id}
                                                    onMouseEnter={() =>
                                                        router.prefetch(
                                                            `/products/${p.slug}`,
                                                        )
                                                    }
                                                    onSelect={() =>
                                                        go(
                                                            `/products/${p.slug}`,
                                                        )
                                                    }
                                                    className="group/item gap-3 rounded-xl px-2.5 py-2.5"
                                                >
                                                    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/70 dark:bg-zinc-800 dark:ring-zinc-700">
                                                        {img ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={img}
                                                                alt=""
                                                                className="size-full object-cover transition-transform duration-300 group-data-[selected=true]/item:scale-110"
                                                            />
                                                        ) : (
                                                            <Package className="size-5 text-zinc-400" />
                                                        )}
                                                        {discountPct > 0 && (
                                                            <span className="absolute left-1 top-1 rounded-md bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                                                                -{discountPct}%
                                                            </span>
                                                        )}
                                                    </span>

                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
                                                            {pick(
                                                                lang,
                                                                p.nameEn,
                                                                p.nameKm,
                                                            )}
                                                        </span>
                                                        <span className="mt-0.5 flex items-center gap-2">
                                                            <span className="font-semibold text-(--brand)">
                                                                {formatPrice(
                                                                    p.price,
                                                                )}
                                                            </span>
                                                            {hasDiscount && (
                                                                <span className="text-xs text-zinc-400 line-through">
                                                                    {formatPrice(
                                                                        p.originalPrice,
                                                                    )}
                                                                </span>
                                                            )}
                                                            {p.reviewCount >
                                                                0 && (
                                                                <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                                                                    <Star className="size-3 fill-current" />
                                                                    {p.averageRating.toFixed(
                                                                        1,
                                                                    )}
                                                                </span>
                                                            )}
                                                            {out && (
                                                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:bg-zinc-800">
                                                                    {tr(
                                                                        lang,
                                                                        'outOfStock',
                                                                    )}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </span>

                                                    <ChevronRight className="size-4 shrink-0 -translate-x-1 text-(--brand) opacity-0 transition-all group-data-[selected=true]/item:translate-x-0 group-data-[selected=true]/item:opacity-100" />
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                )}
                            </CommandList>

                            {/* Footer — keyboard hints + result count */}
                            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-3.5 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <Kbd>↑</Kbd>
                                        <Kbd>↓</Kbd>
                                        {tr(lang, 'searchNavigate')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Kbd>↵</Kbd>
                                        {tr(lang, 'searchSelect')}
                                    </span>
                                    <span className="hidden items-center gap-1 sm:flex">
                                        <Kbd>esc</Kbd>
                                        {tr(lang, 'searchClose')}
                                    </span>
                                </div>
                                {list.length > 0 && (
                                    <span className="tabular-nums">
                                        {list.length} {tr(lang, 'products')}
                                    </span>
                                )}
                            </div>
                        </Command>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}
