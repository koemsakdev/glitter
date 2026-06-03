'use client';

import { DollarSign, Layers, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { InventorySummary } from '@/types/dashboard';

interface InventorySummaryCardProps {
    data: InventorySummary;
}

export function InventorySummaryCard({ data }: InventorySummaryCardProps) {
    const { t } = useI18n();

    const items = [
        {
            icon: DollarSign,
            label: t('dashboard.inventory.totalValue'),
            value: formatPrice(data.totalValue),
            iconColor: 'text-emerald-600 dark:text-emerald-300',
            iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
        },
        {
            icon: TrendingUp,
            label: t('dashboard.inventory.averagePrice'),
            value: formatPrice(data.averagePrice),
            iconColor: 'text-pink-600 dark:text-pink-300',
            iconBg: 'bg-pink-100 dark:bg-pink-500/15',
        },
        {
            icon: Layers,
            label: t('dashboard.inventory.averageStock'),
            value: data.averageStockPerProduct.toLocaleString(),
            iconColor: 'text-blue-600 dark:text-blue-300',
            iconBg: 'bg-blue-100 dark:bg-blue-500/15',
        },
    ];

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">
                    {t('dashboard.inventory.title')}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                    {t('dashboard.inventory.subtitle')}
                </p>
            </div>

            <div className="divide-y divide-border">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <div
                                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${item.iconBg}`}
                            >
                                <Icon className={`size-4 ${item.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {item.label}
                                </p>
                                <p className="text-base font-bold tracking-tight">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}