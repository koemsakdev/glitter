'use client';

import { useState } from 'react';
import { Clock, CreditCard, ShoppingCart, Users } from 'lucide-react';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    DateRangeFilter,
    RANGE_PRESETS,
    type DateRange,
} from '@/features/dashboard/components/date-range-filter';
import { LowStockCard } from '@/features/dashboard/components/low-stock-card';
import { QuickActionsCard } from '@/features/dashboard/components/quick-actions-card';
import { RecentOrdersCard } from '@/features/dashboard/components/recent-orders-card';
import { SalesChart } from '@/features/dashboard/components/sales-chart';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { TopProductsCard } from '@/features/dashboard/components/top-products-card';
import { WelcomeHeader } from '@/features/dashboard/components/welcome-header';
import { useDashboardStats } from '@/features/dashboard/use-dashboard';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';

function pctChange(cur: number, prev: number): number {
    if (prev > 0) return ((cur - prev) / prev) * 100;
    return cur > 0 ? 100 : 0;
}

export default function DashboardHomePage() {
    const { t } = useI18n();
    const [preset, setPreset] = useState('30d');
    const [range, setRange] = useState<DateRange>(() =>
        (RANGE_PRESETS.find((p) => p.key === '30d') ?? RANGE_PRESETS[1]).range(),
    );

    const { data: stats, isLoading, isError, refetch } = useDashboardStats(range);

    if (isLoading) return <LoadingScreen variant="page" />;

    if (isError || !stats) {
        return (
            <ErrorState
                title={t('dashboard.errorTitle')}
                message={t('dashboard.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const { sales } = stats;
    const rangeLabel = t(
        (RANGE_PRESETS.find((p) => p.key === preset) ?? RANGE_PRESETS[1]).label,
    );

    return (
        <div className="space-y-6">
            {/* Header & Quick Actions moved to the top for immediate access */}
            <WelcomeHeader
                action={
                    <DateRangeFilter
                        value={preset}
                        onChange={(key, next) => {
                            setPreset(key);
                            setRange(next);
                        }}
                    />
                }
            />
            <QuickActionsCard />

            {/* Core KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    title={t('dashboard.stats.revenue')}
                    value={formatPrice(sales.revenue)}
                    icon={CreditCard}
                    accent="pink"
                    trend={pctChange(sales.revenue, sales.prevRevenue)}
                    hint={t('dashboard.stats.vsPrev')}
                />
                <StatCard
                    title={t('dashboard.stats.ordersTotal')}
                    value={sales.orders}
                    icon={ShoppingCart}
                    accent="blue"
                    trend={pctChange(sales.orders, sales.prevOrders)}
                    hint={t('dashboard.stats.ordersHint').replace(
                        '{aov}',
                        formatPrice(sales.avgOrderValue),
                    )}
                />
                <StatCard
                    title={t('dashboard.stats.pending')}
                    value={sales.pendingOrders}
                    icon={Clock}
                    accent="amber"
                    hint={t('dashboard.stats.pendingHint')}
                />
                <StatCard
                    title={t('dashboard.stats.customers')}
                    value={sales.customers}
                    icon={Users}
                    accent="emerald"
                    hint={t('dashboard.stats.customersHint')}
                />
            </div>

            {/* Trends & Urgent Actions (Low Stock) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SalesChart
                        data={stats.salesSeries}
                        granularity={stats.range.granularity}
                        rangeLabel={rangeLabel}
                    />
                </div>
                <LowStockCard
                    variants={stats.lowStockVariants}
                    outOfStockCount={stats.variants.outOfStockCount}
                />
            </div>

            {/* Operations & Performance */}
            <TopProductsCard
                title={t('dashboard.bestSelling.title')}
                subtitle={t('dashboard.bestSelling.subtitle')}
                countLabel={t('dashboard.sold')}
                products={stats.bestSelling}
            />
            <RecentOrdersCard orders={stats.recentOrders} />
        </div>
    );
}