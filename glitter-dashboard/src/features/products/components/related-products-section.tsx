'use client';

import {
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Loader2,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useProducts } from '@/features/products/use-products';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { Product } from '@/types/product';

const MAX_RELATED = 10;
const PAGE_SIZE = 8;

interface RelatedProductsSectionProps {
    currentProductId?: string;
    /** Related products are scoped to this category; required to add any. */
    categoryId?: string;
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
    categoryId,
    selected,
    onChange,
}: RelatedProductsSectionProps) {
    const { t } = useI18n();

    const [open, setOpen] = useState(false);
    // The modal's working selection (full Product objects) — applied to the
    // form only when the user clicks "Apply". Nothing is saved to the table
    // until the product itself is saved/updated.
    const [working, setWorking] = useState<Product[]>(selected);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');

    useEffect(() => {
        const id = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(id);
    }, [search]);
    useEffect(() => {
        setPage(1);
    }, [debounced]);

    const { data, isFetching } = useProducts(
        { page, limit: PAGE_SIZE, search: debounced || undefined, categoryId },
        { enabled: open && !!categoryId },
    );

    const products = (data?.data ?? []).filter(
        (p) => p.id !== currentProductId,
    );
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Spinner in the input only while actively searching; the main loading
    // state lives inside the dialog body (below).
    const searching =
        search.trim() !== '' && (isFetching || search.trim() !== debounced);
    const listLoading = isFetching && products.length === 0;

    const workingIds = useMemo(
        () => new Set(working.map((p) => p.id)),
        [working],
    );
    const atMax = working.length >= MAX_RELATED;

    function openModal() {
        setWorking(selected);
        setSearch('');
        setDebounced('');
        setPage(1);
        setOpen(true);
    }

    function toggle(p: Product) {
        setWorking((prev) => {
            if (prev.some((x) => x.id === p.id))
                return prev.filter((x) => x.id !== p.id);
            if (prev.length >= MAX_RELATED) return prev; // enforce the cap
            return [...prev, p];
        });
    }

    function apply() {
        onChange(working);
        setOpen(false);
    }

    function remove(id: string) {
        onChange(selected.filter((p) => p.id !== id));
    }

    return (
        <div className="space-y-3">
            {/* Trigger */}
            <Button
                type="button"
                variant="outline"
                onClick={openModal}
                disabled={!categoryId}
                className="w-full justify-center gap-2"
            >
                <Plus className="size-4" />
                {t('product.related.add')}
                <span className="text-xs text-muted-foreground">
                    ({selected.length}/{MAX_RELATED})
                </span>
            </Button>
            {!categoryId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('product.related.needCategory')}
                </p>
            )}

            {/* Staged selection */}
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

            {/* Browse modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                            <span>{t('product.related.browseTitle')}</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {working.length}/{MAX_RELATED}{' '}
                                {t('product.related.selected')}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Filter */}
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('product.related.filter')}
                            className="pl-9 pr-9"
                        />
                        {searching && (
                            <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-pink-500" />
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {t('product.related.sameCategory')}
                    </p>

                    {atMax && (
                        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            {t('product.related.maxReached').replace(
                                '{max}',
                                String(MAX_RELATED),
                            )}
                        </p>
                    )}

                    {/* Product list */}
                    <div className="max-h-[48vh] min-h-75 overflow-y-auto rounded-lg border">
                        {listLoading ? (
                            <div className="flex h-75 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-6 animate-spin text-pink-500" />
                                {t('common.loading')}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex h-75 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Search className="size-5 opacity-50" />
                                {t('product.related.noProducts')}
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {products.map((p) => {
                                    const checked = workingIds.has(p.id);
                                    const disabled = !checked && atMax;
                                    return (
                                        <li key={p.id}>
                                            <div
                                                role="button"
                                                tabIndex={disabled ? -1 : 0}
                                                aria-disabled={disabled}
                                                onClick={() =>
                                                    !disabled && toggle(p)
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        !disabled &&
                                                        (e.key === 'Enter' ||
                                                            e.key === ' ')
                                                    ) {
                                                        e.preventDefault();
                                                        toggle(p);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2.5 ${
                                                    disabled
                                                        ? 'cursor-not-allowed opacity-50'
                                                        : 'cursor-pointer hover:bg-accent'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    disabled={disabled}
                                                    className="pointer-events-none"
                                                />
                                                <Thumb product={p} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">
                                                        {p.nameEn}
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {p.sku} ·{' '}
                                                        {formatPrice(p.price)}
                                                    </span>
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={page <= 1}
                                onClick={() => setPage((x) => Math.max(1, x - 1))}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {t('product.related.pageOf')
                                    .replace('{page}', String(page))
                                    .replace('{pages}', String(totalPages))}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={page >= totalPages}
                                onClick={() =>
                                    setPage((x) => Math.min(totalPages, x + 1))
                                }
                                aria-label="Next page"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="button" onClick={apply}>
                            {t('product.related.apply')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
