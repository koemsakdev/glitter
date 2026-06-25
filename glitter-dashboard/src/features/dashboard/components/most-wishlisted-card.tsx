'use client';

import { TopProductsCard } from '@/features/dashboard/components/top-products-card';
import { useMostWishlisted } from '@/features/wishlists/use-wishlists';
import { useI18n } from '@/lib/i18n';
import type { TopProduct } from '@/types/dashboard';

export function MostWishlistedCard() {
    const { t } = useI18n();
    const { data } = useMostWishlisted(5);

    const products: TopProduct[] = (data ?? []).map((w) => ({
        id: w.product.id,
        nameEn: w.product.nameEn,
        nameKm: w.product.nameKm,
        sku: w.product.sku,
        price: w.product.price,
        primaryImageUrl:
            w.product.images?.find((i) => i.imageType === 'primary')
                ?.imageUrl ??
            w.product.images?.[0]?.imageUrl ??
            null,
        count: w.count,
    }));

    return (
        <TopProductsCard
            title={t('dashboard.wishlist.title')}
            subtitle={t('dashboard.wishlist.subtitle')}
            countLabel={t('dashboard.wishlist.saves')}
            products={products}
        />
    );
}
