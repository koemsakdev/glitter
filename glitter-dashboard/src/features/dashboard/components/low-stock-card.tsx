'use client';

import { AlertTriangle, ArrowRight, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { LowStockVariant } from '@/types/dashboard';

interface LowStockCardProps {
    variants: LowStockVariant[];
    outOfStockCount: number;
}

export function LowStockCard({ variants, outOfStockCount }: LowStockCardProps) {
    const { t, language } = useI18n();

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <div>
                        <h2 className="text-sm font-semibold">
                            {t('dashboard.lowStock.title')}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            {t('dashboard.lowStock.subtitle')}
                            {outOfStockCount > 0 && (
                                <span className="ml-1 text-destructive">
                  ·{' '}
                                    {t('dashboard.lowStock.outOfStock').replace(
                                        '{count}',
                                        String(outOfStockCount),
                                    )}
                </span>
                            )}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="h-7 text-xs text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:text-pink-300 dark:hover:bg-pink-500/15"
                    render={
                        <Link href="/dashboard/products?status=out_of_stock">
                            {t('dashboard.viewAll')}
                            <ArrowRight className="ml-1 size-3" />
                        </Link>
                    }
                />
            </div>

            {variants.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6">
                    <PackageCheck className="size-5 text-emerald-500/70" />
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('dashboard.lowStock.allGood')}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {variants.map((variant) => {
                        const productName =
                            language === 'km' ? variant.productNameKm : variant.productNameEn;
                        const stockClass =
                            variant.quantityInStock < 5
                                ? 'text-destructive'
                                : 'text-amber-600 dark:text-amber-400';
                        return (
                            <li key={variant.id}>
                                <Link
                                    href={`/dashboard/products/${variant.productId}`}
                                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex flex-1 items-center gap-3 min-w-0">
                                        {variant.colorHex && (
                                            <span
                                                className="inline-block size-3.5 shrink-0 rounded-full border border-border"
                                                style={{ backgroundColor: variant.colorHex }}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">
                                                {productName}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {[variant.size, variant.color]
                                                    .filter(Boolean)
                                                    .join(' · ') || variant.variantSku}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono text-sm font-bold ${stockClass}`}>
                                            {variant.quantityInStock}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {t('dashboard.left')}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}