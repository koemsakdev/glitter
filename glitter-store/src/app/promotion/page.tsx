import Link from 'next/link';
import { Tag } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { PromoOffers } from '@/components/promo-offers';
import { getActivePromotions, getProducts, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { productGridClass } from '@/lib/store-config';
import { tr } from '@/lib/locale';
import type { Product } from '@/lib/types';

export const metadata = { title: 'Promotions' };

// Always reflect live pricing / badge state.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * A product is "on promotion" only when its price is genuinely reduced
 * (originalPrice > price) or it's explicitly tagged with the `sale` badge.
 * Other badges (new / hot / exclusive) are NOT discounts, so they're excluded
 * — otherwise this page would just mirror the full catalogue.
 */
function isOnSale(p: Product): boolean {
    const discounted =
        p.originalPrice != null && Number(p.originalPrice) > Number(p.price);
    const onSaleBadge = (p.badges ?? []).some((b) => b.badgeType === 'sale');
    return discounted || onSaleBadge;
}

export default async function PromotionPage() {
    const [lang, config, promos] = await Promise.all([
        getLang(),
        getStoreConfig(),
        getActivePromotions(),
    ]);

    // No dedicated "on sale" API filter — pull a recent batch and filter here.
    // Fine for this catalogue size; discounted items sort to the front.
    const batch = await getProducts({
        limit: 60,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    }).catch(() => null);

    const products = (batch?.data ?? [])
        .filter(isOnSale)
        .sort((a, b) => {
            // Bigger discount first.
            const da = a.originalPrice
                ? 1 - Number(a.price) / Number(a.originalPrice)
                : 0;
            const db = b.originalPrice
                ? 1 - Number(b.price) / Number(b.originalPrice)
                : 0;
            return db - da;
        });

    const colClass = productGridClass(config.appearance.productColumns);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-(--brand) to-rose-500 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
                <Tag
                    className="pointer-events-none absolute -right-6 -top-6 size-40 rotate-12 opacity-15"
                    strokeWidth={1.5}
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                    <Tag className="size-3.5" />
                    {tr(lang, 'onSale')}
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    {tr(lang, 'promoTitle')}
                </h1>
                <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">
                    {tr(lang, 'promoSubtitle')}
                </p>
            </div>

            {/* Offers & vouchers — the coupons/promotions set in the dashboard */}
            <PromoOffers promos={promos} lang={lang} />

            {/* Products that are actually on sale (discounted or 'sale' badge) */}
            {products.length > 0 && (
                <section className="mt-10">
                    <div className="flex items-center gap-2">
                        <Tag className="size-5 text-(--brand)" />
                        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {tr(lang, 'onSale')}
                        </h2>
                    </div>
                    <div
                        className={`stagger mt-4 grid gap-(--ui-gap) ${colClass}`}
                    >
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} lang={lang} />
                        ))}
                    </div>
                </section>
            )}

            {/* Nothing to show at all */}
            {promos.length === 0 && products.length === 0 && (
                <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-20 text-center dark:border-zinc-700">
                    <Tag className="size-10 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'promoEmpty')}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'promoEmptySub')}
                    </p>
                    <Link
                        href="/products"
                        className="mt-5 rounded-full bg-(--brand) px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        {tr(lang, 'shopAll')}
                    </Link>
                </div>
            )}
        </div>
    );
}
