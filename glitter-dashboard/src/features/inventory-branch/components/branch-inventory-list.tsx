'use client';

import { ImageIcon, Package, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTablePagination } from '@/components/data-table';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { Input } from '@/components/ui/input';
import { useBranchInventory } from '@/features/inventory-branch/use-inventory-branch';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type {
    BranchInventoryProductGroup,
    BranchInventoryVariantRow,
} from '@/types/inventory-branch';

interface BranchInventoryListProps {
    branchId: string;
}

export function BranchInventoryList({ branchId }: BranchInventoryListProps) {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    // Debounce search input → server query; reset to page 1 on change.
    useEffect(() => {
        const handle = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    const { data, isLoading, isPlaceholderData } = useBranchInventory(branchId, {
        page,
        limit: pageSize,
        search: search || undefined,
    });

    const groups = data?.data ?? [];
    const total = data?.total ?? 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <BrandedLoader size="sm" />
            </div>
        );
    }

    const searchActive = search.length > 0;

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('branch.inventory.search')}
                    className="h-10 pl-9"
                />
            </div>

            {total === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 py-12 text-center">
                    <Package className="size-10 text-muted-foreground/40" />
                    <div>
                        <p className="text-sm font-semibold">
                            {searchActive
                                ? t('branch.inventory.noMatch')
                                : t('branch.inventory.empty')}
                        </p>
                        {!searchActive && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('branch.inventory.emptyHelp')}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div
                        className={`space-y-3 transition-opacity ${
                            isPlaceholderData ? 'opacity-60' : ''
                        }`}
                    >
                        {groups.map((group) => (
                            <ProductInventoryCard
                                key={group.productId}
                                product={group}
                            />
                        ))}
                    </div>

                    <DataTablePagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                        disabled={isPlaceholderData}
                    />
                </>
            )}
        </div>
    );
}

/** Card showing one product's variants at this branch. */
function ProductInventoryCard({
    product,
}: {
    product: BranchInventoryProductGroup;
}) {
    const { t, language } = useI18n();
    const productName = language === 'km' ? product.nameKm : product.nameEn;
    const imageUrl = getFileUrl(product.primaryImageUrl);

    return (
        <div className="rounded-lg border border-border/60 bg-card">
            {/* Product header */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={productName}
                                width={48}
                                height={48}
                                className="size-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <ImageIcon className="size-5 text-muted-foreground/40" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <Link
                            href={`/dashboard/products/${product.productId}`}
                            className="block truncate text-sm font-semibold transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                        >
                            {productName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono">{product.sku}</span>
                            <span className="mx-1.5">·</span>
                            {product.variants.length}{' '}
                            {t('branch.inventory.variantCount')}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-pink-600 dark:text-pink-300">
                        {product.totalAvailable}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('product.availability.unitsAvailable')}
                    </p>
                </div>
            </div>

            {/* Variants as compact, wrapping pills — scales cleanly with many variants */}
            <div className="flex flex-wrap gap-2 p-4">
                {product.variants.map((variant) => (
                    <VariantPill key={variant.inventoryId} variant={variant} />
                ))}
            </div>

            {/* Reserved / damaged summary — only shown when there is any */}
            {(product.totalReserved > 0 || product.totalDamaged > 0) && (
                <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-2 text-xs">
                    {product.totalReserved > 0 && (
                        <span className="text-muted-foreground">
                            {t('product.availability.reserved')}:{' '}
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                                {product.totalReserved}
                            </span>
                        </span>
                    )}
                    {product.totalDamaged > 0 && (
                        <span className="text-muted-foreground">
                            {t('product.availability.damaged')}:{' '}
                            <span className="font-semibold text-destructive">
                                {product.totalDamaged}
                            </span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/** A single variant shown as a compact pill: swatch + size·color + available count. */
function VariantPill({ variant }: { variant: BranchInventoryVariantRow }) {
    const available = variant.quantityAvailable;
    const isOut = available === 0;
    const isLow = available > 0 && available < 10;
    const label = [variant.size, variant.color].filter(Boolean).join(' · ');

    const border = isOut
        ? 'border-destructive/30 bg-destructive/5'
        : isLow
            ? 'border-amber-300/50 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-500/5'
            : 'border-border/60 bg-muted/30';
    const count = isOut
        ? 'text-destructive'
        : isLow
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-foreground';

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${border}`}
            title={variant.variantSku}
        >
            {variant.colorHex && variant.color && (
                <span
                    className="inline-block size-3 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: variant.colorHex }}
                />
            )}
            <span className="font-medium text-foreground">{label || '—'}</span>
            <span className={`font-mono font-semibold ${count}`}>{available}</span>
        </div>
    );
}
