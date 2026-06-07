'use client';

import { AlertTriangle, Package, ShoppingBag, Warehouse } from 'lucide-react';
import { useBranchInventorySummary } from '@/features/inventory-branch/use-inventory-branch';
import { useI18n } from '@/lib/i18n';

interface BranchInventorySummaryCardProps {
    branchId: string;
}

export function BranchInventorySummaryCard({
                                               branchId,
                                           }: BranchInventorySummaryCardProps) {
    const { t } = useI18n();
    const { data, isLoading } = useBranchInventorySummary(branchId);

    const stats = [
        {
            label: t('branch.inventory.stats.variants'),
            value: data?.totalVariants ?? 0,
            icon: Package,
            iconBg: 'bg-pink-100 dark:bg-pink-500/15',
            iconColor: 'text-pink-600 dark:text-pink-300',
        },
        {
            label: t('branch.inventory.stats.available'),
            value: data?.totalUnitsAvailable ?? 0,
            icon: Warehouse,
            iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
            iconColor: 'text-emerald-600 dark:text-emerald-300',
        },
        {
            label: t('branch.inventory.stats.reserved'),
            value: data?.totalUnitsReserved ?? 0,
            icon: ShoppingBag,
            iconBg: 'bg-amber-100 dark:bg-amber-500/15',
            iconColor: 'text-amber-600 dark:text-amber-300',
        },
        {
            label: t('branch.inventory.stats.damaged'),
            value: data?.totalUnitsDamaged ?? 0,
            icon: AlertTriangle,
            iconBg: 'bg-red-100 dark:bg-red-500/15',
            iconColor: 'text-red-600 dark:text-red-300',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-lg border border-border/60 bg-card p-4"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-xs text-muted-foreground">
                                {stat.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold tabular-nums">
                                {isLoading ? '—' : stat.value.toLocaleString()}
                            </p>
                        </div>
                        <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-md ${stat.iconBg}`}
                        >
                            <stat.icon className={`size-4 ${stat.iconColor}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}