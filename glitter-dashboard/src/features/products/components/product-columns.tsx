'use client';

import type {ColumnDef} from '@tanstack/react-table';
import {
    Edit,
    Eye,
    ImageIcon,
    MoreHorizontal,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {getFileUrl} from '@/lib/file-url';
import {formatPrice, formatStock} from '@/lib/formatters';
import type {useI18n} from '@/lib/i18n';
import type {Brand} from '@/types/brand';
import type {Category} from '@/types/category';
import type {Product, ProductStatus, ProductType} from '@/types/product';

type TFunction = ReturnType<typeof useI18n>['t'];

interface ProductColumnsContext {
    t: TFunction;
    language: 'en' | 'km';
    brandsById: Map<string, Brand>;
    categoriesById: Map<string, Category>;
    onDelete: (product: Product) => void;
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

const TYPE_STYLES: Record<
    ProductType,
    { bg: string; dot: string }
> = {
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
                                      onDelete,
                                  }: ProductColumnsContext): ColumnDef<Product>[] {
    return [
        {
            id: 'image',
            header: () => t('product.field.image'),
            size: 80,
            cell: ({row}) => {
                const product = row.original;
                const primaryImage =
                    product.images?.find((img) => img.imageType === 'primary') ??
                    product.images?.[0];
                const imageUrl = getFileUrl(primaryImage?.imageUrl ?? null);
                const altName = language === 'km' ? product.nameKm : product.nameEn;

                return (
                    <div
                        className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={altName}
                                width={48}
                                height={48}
                                className="size-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <ImageIcon className="size-5 text-muted-foreground/40"/>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'name',
            header: () => t('product.field.name'),
            cell: ({row}) => {
                const product = row.original;
                const primary = language === 'km' ? product.nameKm : product.nameEn;
                const secondary = language === 'km' ? product.nameEn : product.nameKm;
                // Hide the secondary line when it equals the primary (your test data case)
                const showSecondary =
                    secondary.trim() !== '' &&
                    secondary.trim().toLowerCase() !== primary.trim().toLowerCase();

                return (
                    <div className="flex min-w-0 flex-col">
                        <Link
                            href={`/dashboard/products/${product.id}`}
                            className="truncate font-medium text-foreground transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                        >
                            {primary}
                        </Link>
                        {showSecondary && (
                            <span className="truncate text-xs text-muted-foreground">
                {secondary}
              </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'sku',
            header: () => t('product.field.sku'),
            cell: ({row}) => (
                <span
                    className="inline-block whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {row.original.sku}
                </span>
            ),
        },
        {
            id: 'brand',
            header: () => t('product.field.brand'),
            cell: ({row}) => {
                const brand = brandsById.get(row.original.brandId);
                return brand ? (
                    <span className="text-sm">{brand.name}</span>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                );
            },
        },
        {
            id: 'category',
            header: () => t('product.field.category'),
            cell: ({row}) => {
                const category = categoriesById.get(row.original.categoryId);
                if (!category)
                    return <span className="text-sm text-muted-foreground">—</span>;
                return (
                    <span className="text-sm">
            {language === 'km' ? category.nameKm : category.nameEn}
          </span>
                );
            },
        },
        {
            id: 'price',
            header: () => t('product.field.price'),
            cell: ({row}) => {
                const product = row.original;
                const hasDiscount =
                    product.originalPrice !== null &&
                    product.originalPrice > product.price;
                return (
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="font-semibold">{formatPrice(product.price)}</span>
                        {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'stock',
            header: () => t('product.field.stock'),
            cell: ({row}) => {
                const stock = row.original.totalStock;
                const className =
                    stock === 0
                        ? 'font-mono text-sm font-semibold text-destructive'
                        : stock < 10
                            ? 'font-mono text-sm font-semibold text-amber-600 dark:text-amber-400'
                            : 'font-mono text-sm text-foreground';
                return <span className={className}>{formatStock(stock)}</span>;
            },
        },
        {
            id: 'status',
            header: () => t('product.field.status'),
            cell: ({row}) => {
                const status = row.original.status;
                const style = STATUS_STYLES[status];
                return (
                    <Badge className={style.bg}>
            <span
                className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
            />
                        {t(STATUS_LABELS[status])}
                    </Badge>
                );
            },
        },
        {
            id: 'type',
            header: () => t('product.field.type'),
            cell: ({row}) => {
                const type = row.original.productType;
                const style = TYPE_STYLES[type];
                return (
                    <Badge variant="outline" className={style.bg}>
            <span
                className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
            />
                        {t(TYPE_LABELS[type])}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('common.actions')}</span>,
            size: 60,
            cell: ({row}) => {
                const product = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 opacity-60 transition-opacity hover:opacity-100"
                                    >
                                        <MoreHorizontal className="size-4"/>
                                        <span className="sr-only">{t('common.actions')}</span>
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                    render={
                                        <Link href={`/dashboard/products/${product.id}`}>
                                            <Eye className="mr-2 size-4"/>
                                            {t('product.action.view')}
                                        </Link>
                                    }
                                />
                                <DropdownMenuItem
                                    render={
                                        <Link href={`/dashboard/products/${product.id}/edit`}>
                                            <Edit className="mr-2 size-4"/>
                                            {t('product.action.edit')}
                                        </Link>
                                    }
                                />
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    onClick={() => onDelete(product)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 size-4"/>
                                    {t('product.action.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}