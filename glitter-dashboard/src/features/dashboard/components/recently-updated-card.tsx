'use client';

import { ArrowRight, Clock, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { RecentlyUpdatedProduct } from '@/types/dashboard';

interface RecentlyUpdatedCardProps {
    products: RecentlyUpdatedProduct[];
}

function timeAgo(dateString: string, language: 'en' | 'km'): string {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (language === 'km') {
        if (seconds < 60) return 'ឥឡូវនេះ';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} នាទីមុន`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} ម៉ោងមុន`;
        return `${Math.floor(seconds / 86400)} ថ្ងៃមុន`;
    }

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function RecentlyUpdatedCard({ products }: RecentlyUpdatedCardProps) {
    const { t, language } = useI18n();

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-pink-600 dark:text-pink-300" />
                    <div>
                        <h2 className="text-sm font-semibold">
                            {t('dashboard.recentlyUpdated.title')}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            {t('dashboard.recentlyUpdated.subtitle')}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="h-7 text-xs text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:text-pink-300 dark:hover:bg-pink-500/15"
                    render={
                        <Link href="/dashboard/products?sort=updatedAt-DESC">
                            {t('dashboard.viewAll')}
                            <ArrowRight className="ml-1 size-3" />
                        </Link>
                    }
                />
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Clock className="size-7 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                        {t('dashboard.recentlyUpdated.empty')}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {products.map((product) => {
                        const name = language === 'km' ? product.nameKm : product.nameEn;
                        const imageUrl = getFileUrl(product.primaryImageUrl);
                        return (
                            <li key={product.id}>
                                <Link
                                    href={`/dashboard/products/${product.id}`}
                                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt={name}
                                                width={36}
                                                height={36}
                                                className="size-full object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <ImageIcon className="size-3.5 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">{name}</p>
                                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                                            {product.sku}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(product.updatedAt, language)}
                  </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}