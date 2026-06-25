'use client';

import { ImageIcon, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { TopProduct } from '@/types/dashboard';

interface TopProductsCardProps {
    title: string;
    subtitle: string;
    countLabel: string;
    products: TopProduct[];
}

export function TopProductsCard({
    title,
    subtitle,
    countLabel,
    products,
}: TopProductsCardProps) {
    const { t, language } = useI18n();

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <Package className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.recentProducts.empty')}
                    </p>
                </div>
            ) : (
                <ol className="divide-y">
                    {products.map((product, i) => {
                        const name =
                            language === 'km' ? product.nameKm : product.nameEn;
                        const imageUrl = getFileUrl(product.primaryImageUrl);
                        return (
                            <li key={product.id}>
                                <Link
                                    href={`/dashboard/products/${product.id}`}
                                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                                        {i + 1}
                                    </span>
                                    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt={name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <ImageIcon className="size-4 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-medium leading-tight">
                                            {name}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            {formatPrice(product.price)}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold tabular-nums">
                                            {product.count}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {countLabel}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
