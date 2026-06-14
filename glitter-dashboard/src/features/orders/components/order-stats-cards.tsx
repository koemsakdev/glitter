'use client';

import { Clock, DollarSign, Package, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderStats } from '@/features/orders/use-orders';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';

export function OrderStatsCards({ branchId }: { branchId: string | null }) {
    const { t } = useI18n();
    const { data, isLoading } = useOrderStats(branchId);

    const cards: {
        label: string;
        value: ReactNode;
        icon: typeof Receipt;
        accent: string;
    }[] = [
        {
            label: t('order.stats.todayRevenue'),
            value: formatPrice(data?.todayRevenue ?? 0),
            icon: DollarSign,
            accent: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: t('order.stats.todayOrders'),
            value: data?.todayOrders ?? 0,
            icon: Receipt,
            accent: 'text-pink-600 dark:text-pink-300',
        },
        {
            label: t('order.status.pending'),
            value: data?.statusCounts.pending ?? 0,
            icon: Clock,
            accent: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: t('order.status.processing'),
            value: data?.statusCounts.processing ?? 0,
            icon: Package,
            accent: 'text-indigo-600 dark:text-indigo-400',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className="rounded-lg border bg-card p-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {card.label}
                            </span>
                            <Icon className={`size-4 ${card.accent}`} />
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                card.value
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
