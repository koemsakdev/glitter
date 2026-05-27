'use client';

import {
    ArrowLeft,
    BadgeCheck,
    Edit,
    ImageIcon,
    Package,
    Star,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DetailField,
    DetailSection,
} from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { DeleteProductDialog } from '@/features/products/components/delete-product-dialog';
import { useDeleteProductModal } from '@/features/products/hooks/use-delete-product-modal';
import { useProductImages } from '@/features/product-images/use-product-images';
import { useProduct } from '@/features/products/use-products';
import { useBrandOptions } from '@/lib/hooks/use-brand-options';
import { useCategoryOptions } from '@/lib/hooks/use-category-options';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice, formatStock } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type {
    Product,
    ProductImage,
    ProductStatus,
    ProductType,
} from '@/types/product';

import { useProductVariants } from '@/features/product-variants/use-product-variants';
import type { ProductVariant } from '@/types/product';

interface ProductDetailViewProps {
    id: string;
}

function formatDate(date: string | Date | undefined | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export function ProductDetailView({ id }: ProductDetailViewProps) {
    const { t, language } = useI18n();
    const { data: product, isLoading, isError, refetch } = useProduct(id);
    const { data: images = [] } = useProductImages(id);

    const { data: brands } = useBrandOptions();
    const { data: categories } = useCategoryOptions();

    const { data: variants = [] } = useProductVariants(id);

    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const deleteModal = useDeleteProductModal();

    if (isLoading) {
        return <LoadingScreen variant="page" />;
    }

    if (isError || !product) {
        return (
            <ErrorState
                title={t('product.detail.errorTitle')}
                message={t('product.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const primaryName = language === 'km' ? product.nameKm : product.nameEn;
    const secondaryName = language === 'km' ? product.nameEn : product.nameKm;

    const brand = brands?.find((b) => b.id === product.brandId);
    const category = categories?.find((c) => c.id === product.categoryId);
    const categoryName = category
        ? language === 'km'
            ? category.nameKm
            : category.nameEn
        : '—';

    // Primary image (or fallback to first)
    const primaryImage = images.find((img) => img.imageType === 'primary');
    const heroImage = primaryImage ?? images[0] ?? null;
    const heroImageUrl = heroImage ? getFileUrl(heroImage.imageUrl) : null;

    const hasDiscount =
        product.originalPrice !== null && product.originalPrice > product.price;

    function handleDelete() {
        setDeletingProduct(product!);
        deleteModal.open();
    }

    return (
        <div className="space-y-6">
            {/* Back link */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href="/dashboard/products">
                            <ArrowLeft className="mr-1 size-4" />
                            {t('product.detail.backToList')}
                        </Link>
                    }
                />
            </div>

            {/* Hero — large image left, title/badges/actions right */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Large image */}
                <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15 sm:size-40">
                    {heroImageUrl ? (
                        <Image
                            src={heroImageUrl}
                            alt={primaryName}
                            width={160}
                            height={160}
                            className="size-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <ImageIcon className="size-10 text-muted-foreground/40" />
                    )}
                </div>

                {/* Title + badges + actions */}
                <div className="flex flex-1 flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                {primaryName}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {secondaryName}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <ProductStatusBadge status={product.status} />
                                <ProductTypeBadge type={product.productType} />
                                <span className="text-sm text-muted-foreground">·</span>
                                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {product.sku}
                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 sm:shrink-0">
                            <Button
                                variant="outline"
                                nativeButton={false}
                                render={
                                    <Link href={`/dashboard/products/${product.id}/edit`}>
                                        <Edit className="mr-2 size-4" />
                                        {t('product.action.edit')}
                                    </Link>
                                }
                            />
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="mr-2 size-4" />
                                {t('product.action.delete')}
                            </Button>
                        </div>
                    </div>

                    {/* Price row — prominent */}
                    <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-pink-600 dark:text-pink-300">
              {formatPrice(product.price)}
            </span>
                        {hasDiscount && (
                            <span className="text-base text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main content (left, 2/3) */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Image gallery */}
                    <DetailSection
                        title={t('product.detail.images')}
                        description={
                            images.length > 0
                                ? t('product.detail.imagesCount').replace(
                                    '{count}',
                                    String(images.length),
                                )
                                : undefined
                        }
                    >
                        {images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-12">
                                <ImageIcon className="size-8 text-muted-foreground/40" />
                                <p className="text-sm italic text-muted-foreground">
                                    {t('product.detail.noImages')}
                                </p>
                            </div>
                        ) : (
                            <ImageGallery images={images} altName={primaryName} />
                        )}
                    </DetailSection>

                    {/* Descriptions */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <DetailSection title={t('product.field.descriptionEn')}>
                            {product.descriptionEn ? (
                                <p className="text-sm leading-relaxed text-foreground">
                                    {product.descriptionEn}
                                </p>
                            ) : (
                                <p className="text-sm italic text-muted-foreground">
                                    {t('product.detail.noDescription')}
                                </p>
                            )}
                        </DetailSection>

                        <DetailSection title={t('product.field.descriptionKm')}>
                            {product.descriptionKm ? (
                                <p className="text-sm leading-relaxed text-foreground">
                                    {product.descriptionKm}
                                </p>
                            ) : (
                                <p className="text-sm italic text-muted-foreground">
                                    {t('product.detail.noDescription')}
                                </p>
                            )}
                        </DetailSection>
                    </div>

                    {/* Details */}
                    {(product.detailsEn || product.detailsKm) && (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <DetailSection title={t('product.field.detailsEn')}>
                                {product.detailsEn ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {product.detailsEn}
                                    </p>
                                ) : (
                                    <p className="text-sm italic text-muted-foreground">
                                        {t('product.detail.noDetails')}
                                    </p>
                                )}
                            </DetailSection>

                            <DetailSection title={t('product.field.detailsKm')}>
                                {product.detailsKm ? (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {product.detailsKm}
                                    </p>
                                ) : (
                                    <p className="text-sm italic text-muted-foreground">
                                        {t('product.detail.noDetails')}
                                    </p>
                                )}
                            </DetailSection>
                        </div>
                    )}

                    {/* Variants */}
                    <DetailSection
                        title={t('product.detail.variants')}
                        description={
                            variants.length > 0
                                ? t('product.detail.variantsCount').replace(
                                    '{count}',
                                    String(variants.length),
                                )
                                : undefined
                        }
                    >
                        {variants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-8">
                                <Package className="size-7 text-muted-foreground/40" />
                                <p className="text-sm italic text-muted-foreground">
                                    {t('product.detail.noVariants')}
                                </p>
                            </div>
                        ) : (
                            <VariantTable variants={variants} />
                        )}
                    </DetailSection>

                    {/* Badges placeholder (Phase 1D) */}
                    <ComingSoonSection
                        icon={<BadgeCheck className="size-5" />}
                        title={t('product.detail.badges')}
                        comingSoonText={t('product.detail.badgesComingSoon')}
                    />
                </div>

                {/* Sidebar (right, 1/3) */}
                <div className="space-y-6">
                    {/* Inventory */}
                    <DetailSection title={t('product.detail.inventory')}>
                        <div className="space-y-3">
                            <DetailField label={t('product.field.stock')}>
                                {(() => {
                                    const stock = product.totalStock;
                                    if (stock === 0) {
                                        return (
                                            <span className="font-semibold text-destructive">
                        {formatStock(stock)} · {t('product.stock.outOfStock')}
                      </span>
                                        );
                                    }
                                    if (stock < 10) {
                                        return (
                                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatStock(stock)} · {t('product.stock.low')}
                      </span>
                                        );
                                    }
                                    return (
                                        <span className="font-semibold">
                      {formatStock(stock)}
                    </span>
                                    );
                                })()}
                            </DetailField>
                            <DetailField label={t('product.field.hasBox')}>
                                {product.hasBox ? t('common.yes') : t('common.no')}
                            </DetailField>
                        </div>
                    </DetailSection>

                    {/* Organization */}
                    <DetailSection title={t('product.detail.organization')}>
                        <div className="space-y-3">
                            <DetailField label={t('product.field.brand')}>
                                {brand?.name ?? '—'}
                            </DetailField>
                            <DetailField label={t('product.field.category')}>
                                {categoryName}
                            </DetailField>
                            <DetailField label={t('product.field.slug')}>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                  {product.slug}
                </span>
                            </DetailField>
                        </div>
                    </DetailSection>

                    {/* Ratings */}
                    <DetailSection title={t('product.detail.reviews')}>
                        <div className="space-y-3">
                            <DetailField label={t('product.field.rating')}>
                <span className="font-semibold">
                  {product.averageRating.toFixed(1)}
                </span>{' '}
                                <span className="text-sm text-muted-foreground">/ 5.0</span>
                            </DetailField>
                            <DetailField label={t('product.field.reviewCount')}>
                                {product.reviewCount}
                            </DetailField>
                        </div>
                    </DetailSection>

                    {/* Metadata */}
                    <DetailSection title={t('product.detail.metadata')}>
                        <div className="space-y-3">
                            <DetailField label={t('product.detail.created')}>
                                {formatDate(product.createdAt)}
                            </DetailField>
                            <DetailField label={t('product.detail.updated')}>
                                {formatDate(product.updatedAt)}
                            </DetailField>
                        </div>
                    </DetailSection>
                </div>
            </div>

            <DeleteProductDialog
                product={deletingProduct}
                redirectTo="/dashboard/products"
                onClose={() => setDeletingProduct(null)}
            />
        </div>
    );
}

/**
 * Image gallery — primary image gets a special border + star icon.
 */
function ImageGallery({
  images,
  altName,
}: {
    images: ProductImage[];
    altName: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image) => {
                const url = getFileUrl(image.imageUrl) ?? '';
                const isPrimary = image.imageType === 'primary';
                return (
                    <div
                        key={image.id}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted/30 ${
                            isPrimary
                                ? 'border-pink-400 ring-2 ring-pink-200 dark:border-pink-500 dark:ring-pink-500/30'
                                : 'border-border/60'
                        }`}
                    >
                        <Image
                            src={url}
                            alt={image.imageAltTextEn ?? altName}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                        {isPrimary && (
                            <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-pink-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                                <Star className="size-2.5 fill-current" />
                                <span>Primary</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Variant table — shows all sizes, colors, SKUs, stock, and effective prices.
 */
function VariantTable({ variants }: { variants: ProductVariant[] }) {
    const { t } = useI18n();

    return (
        <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                <tr className="text-left">
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('product.variant.col.size')}
                    </th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('product.variant.col.color')}
                    </th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('product.variant.col.sku')}
                    </th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('product.variant.col.stock')}
                    </th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('product.variant.col.effectivePrice')}
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {variants.map((v) => (
                    <tr key={v.id} className="bg-card hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-sm">
                            {v.size ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                            {v.color ? (
                                <div className="flex items-center gap-2">
                                    {v.colorHex && (
                                        <span
                                            className="inline-block size-4 rounded-full border border-border"
                                            style={{ backgroundColor: v.colorHex }}
                                        />
                                    )}
                                    <span className="text-sm">{v.color}</span>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                            )}
                        </td>
                        <td className="px-3 py-2.5">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {v.variantSku}
                </span>
                        </td>
                        <td className="px-3 py-2.5">
                            <VariantStockCell stock={v.quantityInStock} />
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                            {formatPrice(v.effectivePrice)}
                            {v.priceOverride !== null && (
                                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    Override
                  </span>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Stock cell within a variant table — red for 0, amber for low, normal otherwise.
 */
function VariantStockCell({ stock }: { stock: number }) {
    if (stock === 0) {
        return (
            <span className="font-mono text-sm font-semibold text-destructive">
        0
      </span>
        );
    }
    if (stock < 10) {
        return (
            <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
        {stock}
      </span>
        );
    }
    return (
        <span className="font-mono text-sm text-foreground">{stock}</span>
    );
}

/**
 * Placeholder card for upcoming features (Phase 1C/1D).
 */
function ComingSoonSection({
                               icon,
                               title,
                               comingSoonText,
                           }: {
    icon: React.ReactNode;
    title: string;
    comingSoonText: string;
}) {
    return (
        <div className="rounded-lg border border-dashed bg-muted/20">
            <div className="flex items-start justify-between gap-4 border-b border-dashed px-6 py-4">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{icon}</span>
                    <h2 className="text-base font-semibold">{title}</h2>
                </div>
            </div>
            <div className="px-6 py-8 text-center">
                <p className="text-sm italic text-muted-foreground">{comingSoonText}</p>
            </div>
        </div>
    );
}

/**
 * Status badge — semantic colors.
 */
function ProductStatusBadge({ status }: { status: ProductStatus }) {
    const { t } = useI18n();

    const styles: Record<ProductStatus, { bg: string; dot: string }> = {
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

    const labels: Record<ProductStatus, string> = {
        active: t('product.status.active'),
        draft: t('product.status.draft'),
        out_of_stock: t('product.status.outOfStock'),
        discontinued: t('product.status.discontinued'),
        archived: t('product.status.archived'),
    };

    const style = styles[status];

    return (
        <Badge className={style.bg}>
      <span
          className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
      />
            {labels[status]}
        </Badge>
    );
}

/**
 * Type badge — outline style.
 */
function ProductTypeBadge({ type }: { type: ProductType }) {
    const { t } = useI18n();

    const styles: Record<ProductType, string> = {
        standard: 'border-border bg-muted/50 text-muted-foreground',
        featured:
            'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-500/10 dark:text-pink-300',
        limited:
            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
        exclusive:
            'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-500/10 dark:text-purple-300',
    };

    const labels: Record<ProductType, string> = {
        standard: t('product.type.standard'),
        featured: t('product.type.featured'),
        limited: t('product.type.limited'),
        exclusive: t('product.type.exclusive'),
    };

    return (
        <Badge variant="outline" className={styles[type]}>
            {labels[type]}
        </Badge>
    );
}