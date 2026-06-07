'use client';

import { ImageIcon, Package, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useBranchInventory } from '@/features/inventory-branch/use-inventory-branch';
import { useProducts } from '@/features/products/use-products';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { InventoryBranchRecord } from '@/types/inventory-branch';

interface BranchInventoryListProps {
    branchId: string;
}

interface GroupedProduct {
    productId: string;
    productNameEn: string;
    productNameKm: string;
    productSku: string;
    productSlug: string;
    primaryImageUrl: string | null;
    rows: InventoryBranchRecord[];
    totalAvailable: number;
    totalReserved: number;
    totalDamaged: number;
}

export function BranchInventoryList({ branchId }: BranchInventoryListProps) {
    const { t, language } = useI18n();
    const [search, setSearch] = useState('');

    const { data: inventory, isLoading } = useBranchInventory(branchId);

    // Also fetch products to get primary image URLs (not in inventory response)
    const { data: productsData } = useProducts({ page: 1, limit: 100 });
    const productImageById = useMemo(() => {
        const map = new Map<string, string | null>();
        productsData?.data.forEach((p) => {
            const primary = p.images?.find((img) => img.imageType === 'primary');
            const imageUrl = primary?.imageUrl ?? p.images?.[0]?.imageUrl ?? null;
            map.set(p.id, imageUrl);
        });
        return map;
    }, [productsData]);

    // Group inventory rows by product
    const groupedProducts = useMemo<GroupedProduct[]>(() => {
        if (!inventory) return [];
        const map = new Map<string, GroupedProduct>();

        inventory.forEach((row) => {
            if (!row.product) return;
            const productId = row.product.id;
            const existing = map.get(productId);
            if (existing) {
                existing.rows.push(row);
                existing.totalAvailable += row.quantityAvailable;
                existing.totalReserved += row.quantityReserved;
                existing.totalDamaged += row.quantityDamaged;
            } else {
                map.set(productId, {
                    productId,
                    productNameEn: row.product.nameEn,
                    productNameKm: row.product.nameKm,
                    productSku: row.product.sku,
                    productSlug: row.product.slug,
                    primaryImageUrl: productImageById.get(productId) ?? null,
                    rows: [row],
                    totalAvailable: row.quantityAvailable,
                    totalReserved: row.quantityReserved,
                    totalDamaged: row.quantityDamaged,
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            const aName = language === 'km' ? a.productNameKm : a.productNameEn;
            const bName = language === 'km' ? b.productNameKm : b.productNameEn;
            return aName.localeCompare(bName);
        });
    }, [inventory, language, productImageById]);

    // Client-side search filter
    const filteredProducts = useMemo(() => {
        if (!search.trim()) return groupedProducts;
        const q = search.toLowerCase();
        return groupedProducts.filter(
            (p) =>
                p.productNameEn.toLowerCase().includes(q) ||
                p.productNameKm.toLowerCase().includes(q) ||
                p.productSku.toLowerCase().includes(q) ||
                p.rows.some((r) => r.variant?.variantSku.toLowerCase().includes(q)),
        );
    }, [groupedProducts, search]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="size-6 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
            </div>
        );
    }

    if (groupedProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 py-12 text-center">
                <Package className="size-10 text-muted-foreground/40" />
                <div>
                    <p className="text-sm font-semibold">
                        {t('branch.inventory.empty')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('branch.inventory.emptyHelp')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('branch.inventory.search')}
                    className="h-10 pl-9"
                />
            </div>

            {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('branch.inventory.noMatch')}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredProducts.map((product) => (
                        <ProductInventoryCard
                            key={product.productId}
                            product={product}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Card showing one product's variants at this branch. */
function ProductInventoryCard({ product }: { product: GroupedProduct }) {
    const { t, language } = useI18n();
    const productName =
        language === 'km' ? product.productNameKm : product.productNameEn;
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
                            className="truncate text-sm font-semibold transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                        >
                            {productName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono">{product.productSku}</span>
                            <span className="mx-1.5">·</span>
                            {product.rows.length} {t('branch.inventory.variantCount')}
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

            {/* Variants */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-muted/30">
                    <tr className="text-left">
                        <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('product.variant.col.size')}
                        </th>
                        <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('product.variant.col.color')}
                        </th>
                        <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('product.variant.col.sku')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('branch.inventory.col.available')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('branch.inventory.col.reserved')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('branch.inventory.col.damaged')}
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                    {product.rows.map((row) => (
                        <InventoryVariantRow key={row.id} row={row} />
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function InventoryVariantRow({ row }: { row: InventoryBranchRecord }) {
    const variant = row.variant;
    if (!variant) return null;

    const available = row.quantityAvailable;
    const isOutOfStock = available === 0;
    const isLowStock = available > 0 && available < 10;

    return (
        <tr className="bg-card hover:bg-muted/20">
            <td className="px-4 py-2.5 text-sm">
                {variant.size ?? <span className="text-muted-foreground">—</span>}
            </td>
            <td className="px-4 py-2.5">
                {variant.color ? (
                    <div className="flex items-center gap-2">
                        {variant.colorHex && (
                            <span
                                className="inline-block size-3.5 rounded-full border border-border"
                                style={{ backgroundColor: variant.colorHex }}
                            />
                        )}
                        <span className="text-sm">{variant.color}</span>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                )}
            </td>
            <td className="px-4 py-2.5">
                <span className="inline-block whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {variant.variantSku}
                </span>
            </td>
            <td className="px-4 py-2.5 text-right">
                <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                        isOutOfStock
                            ? 'text-destructive'
                            : isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                    }`}
                >
                  {available}
                </span>
            </td>
            <td className="px-4 py-2.5 text-right">
        <span
            className={`font-mono text-sm tabular-nums ${
                row.quantityReserved > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
            }`}
        >
          {row.quantityReserved}
        </span>
            </td>
            <td className="px-4 py-2.5 text-right">
                <span
                    className={`font-mono text-sm tabular-nums ${
                        row.quantityDamaged > 0
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                    }`}
                >
                  {row.quantityDamaged}
                </span>
            </td>
        </tr>
    );
}