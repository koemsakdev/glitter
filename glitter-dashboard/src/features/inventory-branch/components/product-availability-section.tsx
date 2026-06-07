'use client';

import { Building2, MapPin, Package } from 'lucide-react';
import { useMemo } from 'react';
import {
    DetailSection,
} from '@/components/feedback/detail-section';
import { useProductAvailability } from '@/features/inventory-branch/use-inventory-branch';
import { useI18n } from '@/lib/i18n';
import type { BranchAvailability } from '@/types/inventory-branch';

interface ProductAvailabilitySectionProps {
    productId: string;
}

/** Stock per branch for one product — read-only display on the detail page. */
export function ProductAvailabilitySection({
                                               productId,
                                           }: ProductAvailabilitySectionProps) {
    const { t, language } = useI18n();
    const { data, isLoading, isError } = useProductAvailability(productId);

    // Group branch availability rows by branch (one product may have multiple variants per branch)
    const groupedByBranch = useMemo(() => {
        if (!data) return [];
        const map = new Map<
        string,
        {
            branchId: string;
            branchCode: string;
            branchNameEn: string;
            branchNameKm: string;
            variants: BranchAvailability[];
            totalAvailable: number;
            totalReserved: number;
            totalDamaged: number;
        }
        >();

        data.branches.forEach((row) => {
            const existing = map.get(row.branchId);
            if (existing) {
                existing.variants.push(row);
                existing.totalAvailable += row.quantityAvailable;
                existing.totalReserved += row.quantityReserved;
                existing.totalDamaged += row.quantityDamaged;
            } else {
                map.set(row.branchId, {
                    branchId: row.branchId,
                    branchCode: row.branchCode,
                    branchNameEn: row.branchNameEn,
                    branchNameKm: row.branchNameKm,
                    variants: [row],
                    totalAvailable: row.quantityAvailable,
                    totalReserved: row.quantityReserved,
                    totalDamaged: row.quantityDamaged,
                });
            }
        });

        return Array.from(map.values());
    }, [data]);

    const grandTotalAvailable = useMemo(
        () => groupedByBranch.reduce((sum, b) => sum + b.totalAvailable, 0),
        [groupedByBranch],
    );

    if (isLoading) {
        return (
            <DetailSection title={t('product.availability.title')}>
                <div className="flex items-center justify-center py-8">
                    <div className="size-6 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
                </div>
            </DetailSection>
        );
    }

    if (isError) {
        return (
            <DetailSection title={t('product.availability.title')}>
                <p className="text-sm italic text-destructive">
                    {t('product.availability.errorMessage')}
                </p>
            </DetailSection>
        );
    }

    if (!data || groupedByBranch.length === 0) {
        return (
            <DetailSection
                title={t('product.availability.title')}
                description={t('product.availability.subtitle')}
            >
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 py-10 text-center">
                    <Building2 className="size-8 text-muted-foreground/40" />
                    <div>
                        <p className="text-sm font-semibold">
                            {t('product.availability.empty')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('product.availability.emptyHelp')}
                        </p>
                    </div>
                </div>
            </DetailSection>
        );
    }

    return (
        <DetailSection
            title={t('product.availability.title')}
            description={t('product.availability.summary')
                .replace('{count}', String(grandTotalAvailable))
                .replace('{branches}', String(groupedByBranch.length))}
        >
            <div className="space-y-4">
                {groupedByBranch.map((branch) => {
                    const branchName =
                        language === 'km' ? branch.branchNameKm : branch.branchNameEn;
                    return (
                        <div
                            key={branch.branchId}
                            className="rounded-lg border border-border/60 bg-card"
                        >
                            {/* Branch header */}
                            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-9 items-center justify-center rounded-md bg-pink-100 dark:bg-pink-500/15">
                                        <MapPin className="size-4 text-pink-600 dark:text-pink-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{branchName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-mono">{branch.branchCode}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-pink-600 dark:text-pink-300">
                                        {branch.totalAvailable}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('product.availability.unitsAvailable')}
                                    </p>
                                </div>
                            </div>

                            {/* Variants at this branch */}
                            <div className="divide-y divide-border/60">
                                {branch.variants.map((variant) => (
                                    <VariantRow key={variant.variantId} variant={variant} />
                                ))}
                            </div>

                            {/* Branch totals — only show if there's reserved/damaged stock */}
                            {(branch.totalReserved > 0 || branch.totalDamaged > 0) && (
                                <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-2 text-xs">
                                    {branch.totalReserved > 0 && (
                                        <span className="text-muted-foreground">
                      {t('product.availability.reserved')}:{' '}
                                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {branch.totalReserved}
                      </span>
                    </span>
                                    )}
                                    {branch.totalDamaged > 0 && (
                                        <span className="text-muted-foreground">
                      {t('product.availability.damaged')}:{' '}
                                            <span className="font-semibold text-destructive">
                        {branch.totalDamaged}
                      </span>
                    </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </DetailSection>
    );
}

/** A single variant row inside a branch card. */
function VariantRow({ variant }: { variant: BranchAvailability }) {
    const isOutOfStock = variant.quantityAvailable === 0;
    const isLowStock =
        variant.quantityAvailable > 0 && variant.quantityAvailable < 10;

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            {/* Left: variant identification */}
            <div className="flex min-w-0 items-center gap-3">
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 items-center gap-2">
                    {variant.colorHex && (
                        <span
                            className="inline-block size-3.5 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: variant.colorHex }}
                            title={variant.color ?? ''}
                        />
                    )}
                    <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {variant.size && (
                                <span className="text-sm font-medium">{variant.size}</span>
                            )}
                            {variant.color && (
                                <span className="text-sm text-muted-foreground">
                  · {variant.color}
                </span>
                            )}
                        </div>
                        <span className="truncate font-mono text-[10px] text-muted-foreground">
              {variant.variantSku}
            </span>
                    </div>
                </div>
            </div>

            {/* Right: stock number */}
            <div className="text-right">
                <p
                    className={`font-mono text-sm font-semibold ${
                        isOutOfStock
                            ? 'text-destructive'
                            : isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                    }`}
                >
                    {variant.quantityAvailable}
                </p>
            </div>
        </div>
    );
}