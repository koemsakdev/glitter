'use client';

import {
    FolderTree,
    Package,
    Tag,
    TrendingUp,
} from 'lucide-react';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { InventorySummaryCard } from '@/features/dashboard/components/inventory-summary-card';
import { LowStockCard } from '@/features/dashboard/components/low-stock-card';
import { MostWishlistedCard } from '@/features/dashboard/components/most-wishlisted-card';
import { ProductStatusChart } from '@/features/dashboard/components/product-status-chart';
import { QuickActionsCard } from '@/features/dashboard/components/quick-actions-card';
import { RecentProductsCard } from '@/features/dashboard/components/recent-products-card';
import { RecentlyUpdatedCard } from '@/features/dashboard/components/recently-updated-card';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { TopBrandsCard } from '@/features/dashboard/components/top-brands-card';
import { TopCategoriesCard } from '@/features/dashboard/components/top-categories-card';
import { TopProductsCard } from '@/features/dashboard/components/top-products-card';
import { WelcomeHeader } from '@/features/dashboard/components/welcome-header';
import { useDashboardStats } from '@/features/dashboard/use-dashboard';
import { useI18n } from '@/lib/i18n';

export default function DashboardHomePage() {
    const { t } = useI18n();
    const { data: stats, isLoading, isError, refetch } = useDashboardStats();

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

    return (
        <div className="space-y-4">
            <WelcomeHeader />

            {/* Top row — 4 stat cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    title={t('dashboard.stats.products')}
                    value={stats.products.total}
                    icon={Package}
                    accent="pink"
                    hint={t('dashboard.stats.productsHint')
                        .replace('{active}', String(stats.products.active))
                        .replace('{draft}', String(stats.products.draft))}
                />
                <StatCard
                    title={t('dashboard.stats.brands')}
                    value={stats.brands.total}
                    icon={Tag}
                    accent="blue"
                    hint={t('dashboard.stats.brandsHint').replace(
                        '{active}',
                        String(stats.brands.active),
                    )}
                />
                <StatCard
                    title={t('dashboard.stats.categories')}
                    value={stats.categories.total}
                    icon={FolderTree}
                    accent="amber"
                />
                <StatCard
                    title={t('dashboard.stats.stockUnits')}
                    value={stats.variants.totalStockUnits}
                    icon={TrendingUp}
                    accent="emerald"
                    hint={t('dashboard.stats.stockHint')
                        .replace('{low}', String(stats.variants.lowStockCount))
                        .replace('{out}', String(stats.variants.outOfStockCount))}
                />
            </div>

            {/* Middle row 1 — recent products + status chart */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <RecentProductsCard products={stats.recentProducts} />
                </div>
                <div>
                    <ProductStatusChart data={stats.products} />
                </div>
            </div>

            {/* Best sellers + most bought */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopProductsCard
                    title={t('dashboard.bestSelling.title')}
                    subtitle={t('dashboard.bestSelling.subtitle')}
                    countLabel={t('dashboard.sold')}
                    products={stats.bestSelling}
                />
                <TopProductsCard
                    title={t('dashboard.mostBought.title')}
                    subtitle={t('dashboard.mostBought.subtitle')}
                    countLabel={t('dashboard.orders')}
                    products={stats.mostBought}
                />
                <MostWishlistedCard />
            </div>

            {/* Middle row 2 — top brands + top categories + inventory summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopBrandsCard brands={stats.topBrands} />
                <TopCategoriesCard categories={stats.topCategories} />
                <InventorySummaryCard data={stats.inventory} />
            </div>

            {/* Bottom row — recently updated + low stock + quick actions */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <RecentlyUpdatedCard products={stats.recentlyUpdated} />
                <LowStockCard
                    variants={stats.lowStockVariants}
                    outOfStockCount={stats.variants.outOfStockCount}
                />
                <QuickActionsCard />
            </div>
        </div>
    );
}