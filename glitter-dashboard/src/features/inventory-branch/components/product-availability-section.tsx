'use client';

import { Building2, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import {
    DetailSection,
} from '@/components/feedback/detail-section';
import { useProductAvailability } from '@/features/inventory-branch/use-inventory-branch';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { useI18n } from '@/lib/i18n';
import type { BranchAvailability } from '@/types/inventory-branch';

interface ProductAvailabilitySectionProps {
    productId: string;
    /** When set, only this branch is shown (driven by the topbar branch switcher) */
    selectedBranchId?: string | null;
}

interface GroupedBranch {
    branchId: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
    variants: BranchAvailability[];
    totalAvailable: number;
    totalReserved: number;
    totalDamaged: number;
}

/** Stock per branch for one product — read-only display on the detail page. */
export function ProductAvailabilitySection({
    productId,
    selectedBranchId = null,
}: ProductAvailabilitySectionProps) {
    const { t, language } = useI18n();
    const { data, isLoading, isError } = useProductAvailability(productId);

    // Group branch availability rows by branch (one product may have multiple variants per branch)
    const groupedByBranch = useMemo<GroupedBranch[]>(() => {
        if (!data) return [];
        const map = new Map<string, GroupedBranch>();

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

    // Respect the topbar branch selection — show only that branch when one is picked
    const visibleBranches = useMemo(
        () =>
            selectedBranchId
                ? groupedByBranch.filter((b) => b.branchId === selectedBranchId)
                : groupedByBranch,
        [groupedByBranch, selectedBranchId],
    );

    const grandTotalAvailable = useMemo(
        () => visibleBranches.reduce((sum, b) => sum + b.totalAvailable, 0),
        [visibleBranches],
    );

    if (isLoading) {
        return (
            <DetailSection title={t('product.availability.title')}>
                <div className="flex items-center justify-center py-8">
                    <BrandedLoader size="sm" />
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

    // Not stocked anywhere at all
    if (!data || groupedByBranch.length === 0) {
        return (
            <DetailSection
                title={t('product.availability.title')}
                description={t('product.availability.subtitle')}
            >
                <EmptyState
                    title={t('product.availability.empty')}
                    help={t('product.availability.emptyHelp')}
                />
            </DetailSection>
        );
    }

    // Stocked somewhere, but not at the branch the user is currently viewing
    if (selectedBranchId && visibleBranches.length === 0) {
        return (
            <DetailSection title={t('product.availability.title')}>
                <EmptyState title={t('product.availability.noStockAtBranch')} />
            </DetailSection>
        );
    }

    const description = selectedBranchId
        ? undefined
        : t('product.availability.summary')
              .replace('{count}', String(grandTotalAvailable))
              .replace('{branches}', String(visibleBranches.length));

    return (
        <DetailSection title={t('product.availability.title')} description={description}>
            <div className="space-y-4">
                {visibleBranches.map((branch) => {
                    const branchName =
                        language === 'km' ? branch.branchNameKm : branch.branchNameEn;
                    return (
                        <div
                            key={branch.branchId}
                            className="overflow-hidden rounded-lg border border-border/60 bg-card"
                        >
                            {/* Branch header */}
                            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-pink-100 dark:bg-pink-500/15">
                                        <MapPin className="size-4 text-pink-600 dark:text-pink-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {branchName}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {branch.branchCode}
                                            <span className="ml-2 font-sans">
                                                {t('product.availability.variantsHere').replace(
                                                    '{count}',
                                                    String(branch.variants.length),
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                    {(branch.totalReserved > 0 ||
                                        branch.totalDamaged > 0) && (
                                        <div className="hidden items-center gap-3 text-xs sm:flex">
                                            {branch.totalReserved > 0 && (
                                                <span className="text-muted-foreground">
                                                    {t('product.availability.reserved')}{' '}
                                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                        {branch.totalReserved}
                                                    </span>
                                                </span>
                                            )}
                                            {branch.totalDamaged > 0 && (
                                                <span className="text-muted-foreground">
                                                    {t('product.availability.damaged')}{' '}
                                                    <span className="font-semibold text-destructive">
                                                        {branch.totalDamaged}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="text-right leading-tight">
                                        <p className="text-lg font-bold text-pink-600 dark:text-pink-300">
                                            {branch.totalAvailable}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('product.availability.unitsAvailable')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Variants as compact, wrapping pills — scales cleanly with many sizes/colors */}
                            <div className="flex flex-wrap gap-2 p-4">
                                {branch.variants.map((variant) => (
                                    <VariantPill
                                        key={variant.variantId}
                                        variant={variant}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </DetailSection>
    );
}

function EmptyState({ title, help }: { title: string; help?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 py-10 text-center">
            <Building2 className="size-8 text-muted-foreground/40" />
            <div>
                <p className="text-sm font-semibold">{title}</p>
                {help && (
                    <p className="mt-1 text-xs text-muted-foreground">{help}</p>
                )}
            </div>
        </div>
    );
}

/** A single variant shown as a compact pill: swatch + size·color + stock count. */
function VariantPill({ variant }: { variant: BranchAvailability }) {
    const isOut = variant.quantityAvailable === 0;
    const isLow =
        variant.quantityAvailable > 0 && variant.quantityAvailable < 10;
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
        >
            {variant.colorHex && (
                <span
                    className="inline-block size-3 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: variant.colorHex }}
                    title={variant.color ?? ''}
                />
            )}
            {label && (
                <span className="font-medium text-foreground">{label}</span>
            )}
            <span className={`font-mono font-semibold ${count}`}>
                {variant.quantityAvailable}
            </span>
        </div>
    );
}
