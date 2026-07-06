import { AdSlot } from '@/components/ad-slot';
import { BannerCarousel } from '@/components/banner-carousel';
import { FeaturesStrip } from '@/components/features-strip';
import { SectionBlock, resolveSectionProducts } from '@/components/home-section';
import {
    getBanners,
    getCategories,
    getProducts,
    getStoreConfig,
} from '@/lib/api';
import { getLang } from '@/lib/lang';
import type { Banner, Category } from '@/lib/types';

export default async function HomePage() {
    const [config, lang, categories, latest, banners] = await Promise.all([
        getStoreConfig(),
        getLang(),
        getCategories().catch(() => [] as Category[]),
        getProducts({ limit: 12, sortBy: 'createdAt', sortOrder: 'DESC' }).catch(
            () => null,
        ),
        getBanners().catch(() => [] as Banner[]),
    ]);
    const homeSections = config.sections.filter(
        (s) => s.enabled && s.page === 'home',
    );
    const sectionProducts = await resolveSectionProducts(
        homeSections,
        latest?.data ?? [],
        getProducts,
    );

    return (
        <div>
            {/* Promo banners (carousel) — full-bleed hero with blurred backdrop */}
            {banners.length > 0 && (
                <BannerCarousel banners={banners} lang={lang} />
            )}

            {/* Trust / features strip */}
            <FeaturesStrip lang={lang} freeOver={config.delivery.freeOver} />

            {/* Ad slot — top of home */}
            <AdSlot
                location="home_top"
                lang={lang}
                className="mx-auto mt-6 max-w-6xl space-y-4 px-4"
            />

            {/* Sections (in the order configured in the dashboard) */}
            {homeSections.map((section) => (
                <SectionBlock
                    key={section.id}
                    section={section}
                    lang={lang}
                    categories={categories}
                    products={sectionProducts.get(section.id) ?? []}
                    columns={config.appearance.productColumns}
                />
            ))}

            {/* Ad slot — middle/below sections */}
            <AdSlot
                location="home_middle"
                lang={lang}
                className="mx-auto my-10 max-w-6xl space-y-4 px-4"
            />
        </div>
    );
}
