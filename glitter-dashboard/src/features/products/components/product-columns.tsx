'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Heart, ImageIcon } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/safe-image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/resource/row-actions';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import type { useI18n } from '@/lib/i18n';
import type { Brand } from '@/types/brand';
import type { Category } from '@/types/category';
import type { Product, ProductStatus, ProductType } from '@/types/product';

type TFunction = ReturnType<typeof useI18n>['t'];

interface ProductColumnsContext {
    t: TFunction;
    language: 'en' | 'km';
    brandsById: Map<string, Brand>;
    categoriesById: Map<string, Category>;
    hasBranchFilter?: boolean;
    wishlistCounts?: Record<string, number>;
    onDelete: (product: Product) => void;
    /** Admin only: show Edit / Delete (others can just view). */
    canManage?: boolean;
}

const STATUS_STYLES: Record<ProductStatus, { bg: string; dot: string }> = {
    active: {
        bg: 'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15',
        dot: 'bg-pink-500 dark:bg-pink-400',
    },
    draft: {
        bg: 'bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-500/15 dark:text-slate-300 dark:hover:bg-slate-500/15',
        dot: 'bg-slate-500 dark:bg-slate-400',
    },
    out_of_stock: {
        bg: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    discontinued: {
        bg: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/15',
        dot: 'bg-orange-500 dark:bg-orange-400',
    },
    archived: {
        bg: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/15',
        dot: 'bg-zinc-500 dark:bg-zinc-400',
    },
};

const STATUS_LABELS: Record<
    ProductStatus,
    | 'product.status.active'
    | 'product.status.draft'
    | 'product.status.outOfStock'
    | 'product.status.discontinued'
    | 'product.status.archived'
> = {
    active: 'product.status.active',
    draft: 'product.status.draft',
    out_of_stock: 'product.status.outOfStock',
    discontinued: 'product.status.discontinued',
    archived: 'product.status.archived',
};

const TYPE_STYLES: Record<ProductType, { bg: string; dot: string }> = {
    standard: {
        bg: 'border-border bg-muted/50 text-muted-foreground',
        dot: 'bg-muted-foreground/60',
    },
    featured: {
        bg: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-500/10 dark:text-pink-300',
        dot: 'bg-pink-500 dark:bg-pink-400',
    },
    limited: {
        bg: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    exclusive: {
        bg: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-500/10 dark:text-purple-300',
        dot: 'bg-purple-500 dark:bg-purple-400',
    },
};

const TYPE_LABELS: Record<
    ProductType,
    | 'product.type.standard'
    | 'product.type.featured'
    | 'product.type.limited'
    | 'product.type.exclusive'
> = {
    standard: 'product.type.standard',
    featured: 'product.type.featured',
    limited: 'product.type.limited',
    exclusive: 'product.type.exclusive',
};

export function getProductColumns({
    t,
    language,
    brandsById,
    categoriesById,
    hasBranchFilter,
    wishlistCounts,
    onDelete,
    canManage = false,
}: ProductColumnsContext): ColumnDef<Product>[] {
    return [
        {
            // Photo + name + SKU in one cell — easier to scan than 3 columns.
            id: 'name',
            meta: { sortKey: 'nameEn' },
            header: () => t('product.field.product'),
            cell: ({ row }) => {
                const product = row.original;
                const primaryImage =
                    product.images?.find(
                        (img) => img.imageType === 'primary',
                    ) ?? product.images?.[0];
                const imageUrl = getFileUrl(primaryImage?.imageUrl ?? null);
                const name =
                    language === 'km' ? product.nameKm : product.nameEn;
                const other =
                    language === 'km' ? product.nameEn : product.nameKm;
                const showOther =
                    other.trim() !== '' &&
                    other.trim().toLowerCase() !== name.trim().toLowerCase();

                return (
                    <div className="flex min-w-60 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt={name}
                                    width={44}
                                    height={44}
                                    className="size-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                <ImageIcon className="size-5 text-muted-foreground/40" />
                            )}
                        </div>
                        <div className="min-w-0 max-w-72">
                            <Link
                                href={`/dashboard/products/${product.id}`}
                                className="block truncate font-medium text-foreground transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                                title={name}
                            >
                                {name}
                            </Link>
                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="truncate font-mono text-[11px] uppercase tracking-wide">
                                    {product.sku}
                                </span>
                                {showOther && (
                                    <>
                                        <span className="text-muted-foreground/40">
                                            ·
                                        </span>
                                        <span className="truncate">
                                            {other}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'category',
            header: () => t('product.field.category'),
            cell: ({ row }) => {
                const category = categoriesById.get(row.original.categoryId);
                const brand = brandsById.get(row.original.brandId);
                if (!category && !brand)
                    return (
                        <span className="text-sm text-muted-foreground">—</span>
                    );
                return (
                    <div className="min-w-0 max-w-44 leading-tight">
                        <p className="truncate text-sm">
                            {category
                                ? language === 'km'
                                    ? category.nameKm
                                    : category.nameEn
                                : '—'}
                        </p>
                        {brand && (
                            <p className="truncate text-xs text-muted-foreground">
                                {brand.name}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'price',
            meta: { sortKey: 'price', align: 'right' },
            header: () => t('product.field.price'),
            cell: ({ row }) => {
                const product = row.original;
                const original = product.originalPrice;
                const hasDiscount =
                    original !== null && original > product.price;
                const pct = hasDiscount
                    ? Math.round((1 - product.price / original) * 100)
                    : 0;
                return (
                    <div className="whitespace-nowrap leading-tight">
                        <p className="font-semibold tabular-nums">
                            {formatPrice(product.price)}
                        </p>
                        {hasDiscount && (
                            <p className="flex items-center justify-end gap-1 text-xs">
                                <span className="text-muted-foreground line-through tabular-nums">
                                    {formatPrice(original)}
                                </span>
                                <span className="rounded bg-pink-100 px-1 text-[10px] font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                                    -{pct}%
                                </span>
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'stock',
            meta: { sortKey: 'totalStock', align: 'right' },
            header: () => t('product.field.stock'),
            cell: ({ row }) => {
                const product = row.original;
                // When filtering by branch, show stock at that branch; otherwise show total
                const stock = hasBranchFilter
                    ? (product.branchStock ?? 0)
                    : product.totalStock;
                const tone =
                    stock === 0
                        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                        : stock < 10
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
                const dot =
                    stock === 0
                        ? 'bg-red-500'
                        : stock < 10
                          ? 'bg-amber-500'
                          : 'bg-emerald-500';
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}
                        title={
                            stock === 0
                                ? t('product.stock.outOfStock')
                                : stock < 10
                                  ? t('product.stock.low')
                                  : undefined
                        }
                    >
                        <span className={`size-1.5 rounded-full ${dot}`} />
                        {stock === 0 ? t('product.stock.outOfStock') : stock}
                    </span>
                );
            },
            size: 110,
        },
        {
            id: 'wishlists',
            meta: { align: 'right' },
            header: () => t('product.field.wishlists'),
            cell: ({ row }) => {
                const count = wishlistCounts?.[row.original.id] ?? 0;
                return (
                    <span
                        className={`inline-flex items-center gap-1 text-sm tabular-nums ${
                            count > 0
                                ? 'text-foreground'
                                : 'text-muted-foreground/60'
                        }`}
                    >
                        <Heart
                            className={`size-3.5 ${
                                count > 0
                                    ? 'fill-pink-500 text-pink-500'
                                    : 'text-muted-foreground/40'
                            }`}
                        />
                        {count}
                    </span>
                );
            },
            size: 90,
        },
        {
            id: 'status',
            meta: { sortKey: 'status' },
            header: () => t('product.field.status'),
            cell: ({ row }) => {
                const { status, productType } = row.original;
                const style = STATUS_STYLES[status];
                const typeStyle = TYPE_STYLES[productType];
                return (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={style.bg}>
                            <span
                                className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
                            />
                            {t(STATUS_LABELS[status])}
                        </Badge>
                        {/* Type only when it's special — "Standard" is noise. */}
                        {productType !== 'standard' && (
                            <Badge variant="outline" className={typeStyle.bg}>
                                {t(TYPE_LABELS[productType])}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => (
                <span className="sr-only">{t('common.actions')}</span>
            ),
            size: 60,
            cell: ({ row }) => (
                <RowActions
                    viewHref={`/dashboard/products/${row.original.id}`}
                    editHref={`/dashboard/products/${row.original.id}/edit`}
                    onDelete={() => onDelete(row.original)}
                    canManage={canManage}
                    audit={{
                        entity: 'products',
                        id: row.original.id,
                        label: row.original.nameEn,
                    }}
                />
            ),
        },
    ];
}
