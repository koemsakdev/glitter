import Link from 'next/link';
import { BannerCarousel } from '@/components/banner-carousel';
import { ProductCard } from '@/components/product-card';
import { getCategories, getProducts, getStoreConfig } from '@/lib/api';
import { getLang, pick, tr } from '@/lib/locale';
import type { Category, Product } from '@/lib/types';
import type { HomeSection } from '@/lib/store-config';

export default async function HomePage() {
    const [config, lang, categories, latest] = await Promise.all([
        getStoreConfig(),
        getLang(),
        getCategories().catch(() => [] as Category[]),
        getProducts({ limit: 8, sortBy: 'createdAt', sortOrder: 'DESC' }).catch(
            () => null,
        ),
    ]);

    const products = latest?.data ?? [];
    const banners = config.banners.filter((b) => b.enabled && b.imageUrl);

    return (
        <div>
            {/* Promo banners (carousel) */}
            {banners.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-6">
                    <BannerCarousel banners={banners} lang={lang} />
                </section>
            )}

            {/* Hero */}
            <section className="bg-linear-to-br from-pink-50 via-white to-pink-100/50">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
                    <div className="max-w-xl">
                        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
                            {pick(lang, config.heroTitleEn, config.heroTitleKm)}
                        </h1>
                        <p className="mt-4 text-lg text-zinc-600">
                            {pick(lang, config.heroSubtitleEn, config.heroSubtitleKm)}
                        </p>
                        <Link
                            href={config.heroCtaHref || '/products'}
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            {pick(lang, config.heroCtaEn, config.heroCtaKm) ||
                                tr(lang, 'shop')}
                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Sections (in the order configured in the dashboard) */}
            {config.sections
                .filter((s) => s.enabled)
                .map((section) => (
                    <HomeSectionBlock
                        key={section.id}
                        section={section}
                        lang={lang}
                        categories={categories}
                        products={products}
                    />
                ))}
        </div>
    );
}

function HomeSectionBlock({
    section,
    lang,
    categories,
    products,
}: {
    section: HomeSection;
    lang: 'en' | 'km';
    categories: Category[];
    products: Product[];
}) {
    const title = pick(lang, section.titleEn, section.titleKm);

    if (section.type === 'categories') {
        if (categories.length === 0) return null;
        return (
            <section className="mx-auto max-w-6xl px-4 py-10">
                <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((c) => (
                        <Link
                            key={c.id}
                            href={`/products?categoryId=${c.id}`}
                            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand)"
                        >
                            {pick(lang, c.nameEn, c.nameKm)}
                        </Link>
                    ))}
                </div>
            </section>
        );
    }

    // new-arrivals
    return (
        <section className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                <Link
                    href="/products"
                    className="text-sm font-medium text-(--brand) hover:underline"
                >
                    {tr(lang, 'viewAll')}
                </Link>
            </div>
            {products.length === 0 ? (
                <p className="mt-6 text-sm text-zinc-500">{tr(lang, 'noProducts')}</p>
            ) : (
                <div className="mt-5 grid grid-cols-2 gap-(--ui-gap) sm:grid-cols-3 lg:grid-cols-4">
                    {products.map((p) => (
                        <ProductCard key={p.id} product={p} lang={lang} />
                    ))}
                </div>
            )}
        </section>
    );
}
