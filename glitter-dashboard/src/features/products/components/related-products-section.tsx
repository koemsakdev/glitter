'use client';

import { ImageIcon, Loader2, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/features/products/use-products';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { Product } from '@/types/product';

interface RelatedProductsSectionProps {
    currentProductId?: string;
    selected: Product[];
    onChange: (next: Product[]) => void;
}

function Thumb({ product }: { product: Product }) {
    const primary =
        product.images?.find((img) => img.imageType === 'primary') ??
        product.images?.[0];
    const url = getFileUrl(primary?.imageUrl ?? null);
    return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt=""
            className="size-10 shrink-0 rounded-md border object-cover"
        />
    ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <ImageIcon className="size-4" />
        </div>
    );
}

export function RelatedProductsSection({
    currentProductId,
    selected,
    onChange,
}: RelatedProductsSectionProps) {
    const { t } = useI18n();
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');

    // Debounce so we don't fire a heavy product query on every keystroke.
    useEffect(() => {
        const id = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(id);
    }, [search]);

    const { data, isFetching } = useProducts(
        { search: debounced || undefined, limit: 8 },
        { enabled: debounced.length > 0 },
    );

    // While the user is typing (or the debounced query is loading), show a spinner.
    const loading = search.trim() !== '' && (isFetching || search.trim() !== debounced);

    const selectedIds = new Set(selected.map((p) => p.id));
    const results = (data?.data ?? []).filter(
        (p) => p.id !== currentProductId && !selectedIds.has(p.id),
    );

    function add(product: Product) {
        onChange([...selected, product]);
        setSearch('');
    }
    function remove(id: string) {
        onChange(selected.filter((p) => p.id !== id));
    }

    return (
        <div className="space-y-3">
            {/* Search to add */}
            <div>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('product.related.search')}
                        className="pl-9 pr-9"
                    />
                    {loading && (
                        <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-pink-500" />
                    )}
                </div>

                {search.trim() && (
                    <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border bg-popover p-1 shadow-sm">
                        {loading ? (
                            <li className="flex items-center justify-center gap-2 px-2 py-5 text-xs text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                {t('product.related.searching')}
                            </li>
                        ) : results.length === 0 ? (
                            <li className="flex flex-col items-center gap-1 px-2 py-5 text-center text-xs text-muted-foreground">
                                <Search className="size-4 opacity-50" />
                                {t('product.related.noResults')}
                            </li>
                        ) : (
                            results.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => add(p)}
                                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-accent"
                                    >
                                        <Thumb product={p} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">
                                                {p.nameEn}
                                            </span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {p.sku} · {formatPrice(p.price)}
                                            </span>
                                        </span>
                                        <Plus className="size-4 shrink-0 text-pink-500" />
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {/* Selected list */}
            {selected.length > 0 ? (
                <ul className="space-y-2">
                    {selected.map((p) => (
                        <li
                            key={p.id}
                            className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2"
                        >
                            <Thumb product={p} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {p.nameEn}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {p.sku} · {formatPrice(p.price)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(p.id)}
                                className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label={t('common.delete')}
                            >
                                <X className="size-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    {t('product.related.empty')}
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                {t('product.related.hint')}
            </p>
        </div>
    );
}
