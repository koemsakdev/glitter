'use client';

import { ArrowRight, ImageIcon, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { RecentProduct } from '@/types/dashboard';

interface RecentProductsCardProps {
    products: RecentProduct[];
}

export function RecentProductsCard({ products }: RecentProductsCardProps) {
    const { t, language } = useI18n();

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold">
                        {t('dashboard.recentProducts.title')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                        {t('dashboard.recentProducts.subtitle')}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="h-7 text-xs text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:text-pink-300 dark:hover:bg-pink-500/15"
                    render={
                        <Link href="/dashboard/products">
                            {t('dashboard.viewAll')}
                            <ArrowRight className="ml-1 size-3" />
                        </Link>
                    }
                />
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <Package className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.recentProducts.empty')}
                    </p>
                </div>
            ) : (
                <div
                    className={`grid gap-px bg-border ${
                        products.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                >
                    {products.map((product) => {
                        const name = language === 'km' ? product.nameKm : product.nameEn;
                        const imageUrl = getFileUrl(product.primaryImageUrl);
                        return (
                            <Link
                                key={product.id}
                                href={`/dashboard/products/${product.id}`}
                                className="group relative overflow-hidden bg-card transition-colors hover:bg-muted/40"
                            >
                                <div className="flex gap-3 p-3">
                                    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt={name}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                unoptimized
                                            />
                                        ) : (
                                            <ImageIcon className="size-5 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-medium leading-tight">
                                            {name}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                            {product.sku}
                                        </p>
                                        <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-pink-600 dark:text-pink-300">
                        {formatPrice(product.price)}
                      </span>
                                            <span className="text-[11px] text-muted-foreground">
                        {product.totalStock} {t('dashboard.inStock')}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}