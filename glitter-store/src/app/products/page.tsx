import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, SearchX } from 'lucide-react';
import { ProductFilters } from '@/components/product-filters';
import { CategoryChips } from '@/components/category-chips';
import { ProductSearch } from '@/components/product-search';
import { SectionBlock } from '@/components/home-section';
import { resolveSectionProducts } from '@/components/home-section-data';
import { ProductCard } from '@/components/product-card';
import { Pagination } from '@/components/products/pagination';
import { ViewTabs } from '@/components/products/view-tabs';
import {
    ProductCardSkeletons,
    ProductGridSkeleton,
} from '@/components/products/product-grid-skeleton';
import {
    fileUrl,
    getActiveBrands,
    getBestSellers,
    getCategories,
    getProducts,
    getStoreConfig,
    type ProductQuery,
} from '@/lib/api';
import { getLang } from '@/lib/lang';
import {
    productGridClass,
    type HomeSection,
    type StoreConfig,
} from '@/lib/store-config';
import type { Category } from '@/lib/types';
import { T, Tr } from '@/lib/lang-context';
import { pick, tr, type Lang } from '@/lib/locale';

export const metadata = { title: 'Shop' };

// No route-wide `force-no-store`: it overrode every fetch's own caching, so the
// store config, categories and brands were re-fetched from the API on every
// request. The page is still rendered per request (it reads searchParams), and
// the product list itself is fetched fresh (see ProductResults).

const PAGE_SIZE = 12;

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'name' | 'rating';

const SORTS: {
    key: SortKey;
    trKey: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}[] = [
    { key: 'newest', trKey: 'newest', sortBy: 'createdAt', sortOrder: 'DESC' },
    { key: 'price-asc', trKey: 'priceLow', sortBy: 'price', sortOrder: 'ASC' },
    {
        key: 'price-desc',
        trKey: 'priceHigh',
        sortBy: 'price',
        sortOrder: 'DESC',
    },
    { key: 'name', trKey: 'nameAZ', sortBy: 'nameEn', sortOrder: 'ASC' },
    {
        key: 'rating',
        trKey: 'topRated',
        sortBy: 'averageRating',
        sortOrder: 'DESC',
    },
];

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

function buildHref(
    current: {
        search?: string;
        categoryId?: string;
        brandIds?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: string;
    },
    overrides: Partial<{
        search: string;
        categoryId: string;
        brandIds: string;
        minPrice: string;
        maxPrice: string;
        sort: string;
        page: number;
    }>,
): string {
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (merged.search) params.set('search', merged.search);
    if (merged.categoryId) params.set('categoryId', merged.categoryId);
    if (merged.brandIds) params.set('brandIds', merged.brandIds);
    if (merged.minPrice) params.set('minPrice', merged.minPrice);
    if (merged.maxPrice) params.set('maxPrice', merged.maxPrice);
    if (merged.sort && merged.sort !== 'newest')
        params.set('sort', merged.sort);
    if (overrides.page && overrides.page > 1)
        params.set('page', String(overrides.page));
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
}

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const [sp, lang, config] = await Promise.all([
        searchParams,
        getLang(),
        getStoreConfig(),
    ]);
    const search = first(sp.search) ?? '';
    const categoryId = first(sp.categoryId) ?? '';
    const brandIds = first(sp.brandIds) ?? '';
    const selectedBrandIds = brandIds.split(',').filter(Boolean);
    const minPrice = first(sp.minPrice) ?? '';
    const maxPrice = first(sp.maxPrice) ?? '';
    const sort = (first(sp.sort) as SortKey) || config.appearance.productSort;
    const view = first(sp.view) ?? '';
    const page = Math.max(1, Number(first(sp.page)) || 1);

    // Curated lists (from a home section's "View all"): best sellers is its own
    // popularity ranking; new arrivals is always newest-first. Sorting and
    // filtering would contradict them, so those controls are hidden there.
    const isCurated =
        (view === 'best-selling' || view === 'new-arrivals') &&
        !search &&
        !categoryId &&
        !brandIds;
    const curatedView = isCurated ? view : '';

    const sortDef =
        curatedView === 'new-arrivals'
            ? SORTS[0]
            : (SORTS.find((s) => s.key === sort) ?? SORTS[0]);
    const current = { search, categoryId, brandIds, minPrice, maxPrice, sort };

    const query: ProductQuery = {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandIds: brandIds || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy: sortDef.sortBy,
        sortOrder: sortDef.sortOrder,
    };

    // Both are cached for minutes, so this is quick; the product list streams
    // in separately below.
    const [categories, brands] = await Promise.all([
        getCategories().catch(() => []),
        getActiveBrands().catch(() => []),
    ]);

    const colClass = productGridClass(config.appearance.productColumns);
    const activeCategory = categoryId
        ? categories.find((c) => c.id === categoryId)
        : null;

    // Configured sections for this page — only on the unfiltered base view.
    const isBaseView =
        !search &&
        !categoryId &&
        !brandIds &&
        !minPrice &&
        !maxPrice &&
        !view &&
        page === 1;
    const productSections = isBaseView
        ? config.sections.filter((s) => s.enabled && s.page === 'products')
        : [];

    // A new key per list → the results boundary shows its skeleton while the
    // new list loads, and the infinite grid restarts from page 1.
    const resultsKey = JSON.stringify({ query, curatedView });

    return (
        <>
            {productSections.length > 0 && (
                <Suspense fallback={<SectionsSkeleton colClass={colClass} />}>
                    <ConfiguredSections
                        sections={productSections}
                        lang={lang}
                        categories={categories}
                        config={config}
                    />
                </Suspense>
            )}

            <div className="mx-auto max-w-6xl px-4 py-6">
                {/* Breadcrumb */}
                <nav className="mb-3 flex items-center gap-1 text-xs font-medium text-zinc-400">
                    <Link href="/" className="hover:text-(--brand)">
                        {tr(lang, 'breadcrumbHome')}
                    </Link>
                    <ChevronRight className="size-3" />
                    {search || activeCategory || curatedView ? (
                        <>
                            <Link
                                href="/products"
                                className="hover:text-(--brand)"
                            >
                                {tr(lang, 'shop')}
                            </Link>
                            <ChevronRight className="size-3" />
                            <span className="truncate text-zinc-600 dark:text-zinc-300">
                                {search
                                    ? `“${search}”`
                                    : activeCategory
                                      ? pick(
                                            lang,
                                            activeCategory.nameEn,
                                            activeCategory.nameKm,
                                        )
                                      : tr(
                                            lang,
                                            curatedView === 'best-selling'
                                                ? 'bestSellers'
                                                : 'newArrivals',
                                        )}
                            </span>
                        </>
                    ) : (
                        <span className="text-zinc-600 dark:text-zinc-300">
                            {tr(lang, 'shop')}
                        </span>
                    )}
                </nav>

                {/* Compact title only where the tabs don't already say it
                    (a search or a category); no banner. */}
                {search || activeCategory ? (
                    <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        <span className="h-5 w-1 rounded-full bg-(--brand)" />
                        {search ? (
                            <>
                                <Tr k="resultsFor" /> “{search}”
                            </>
                        ) : (
                            <T
                                en={activeCategory!.nameEn}
                                km={activeCategory!.nameKm}
                            />
                        )}
                    </h1>
                ) : (
                    <h1 className="sr-only">
                        {tr(
                            lang,
                            curatedView === 'best-selling'
                                ? 'bestSellers'
                                : curatedView === 'new-arrivals'
                                  ? 'newArrivals'
                                  : 'allProducts',
                        )}
                    </h1>
                )}

                {/* Switch between the main lists */}
                {!search && !activeCategory && (
                    <div>
                        <ViewTabs active={curatedView} lang={lang} />
                    </div>
                )}

                {!isCurated && (
                    <>
                        <div className="mt-5 flex items-center gap-3">
                            <ProductSearch />
                            <ProductFilters
                                lang={lang}
                                brands={brands.map((b) => ({
                                    id: b.id,
                                    name: b.name,
                                    logo: fileUrl(b.logoUrl),
                                }))}
                                sortOptions={SORTS.map((s) => ({
                                    key: s.key,
                                    trKey: s.trKey,
                                }))}
                            />
                        </div>
                        <CategoryChips
                            lang={lang}
                            activeId={categoryId}
                            categories={categories.map((c) => ({
                                id: c.id,
                                nameEn: c.nameEn,
                                nameKm: c.nameKm,
                                iconUrl: c.iconUrl,
                            }))}
                        />
                    </>
                )}

                {/* Active filter chips (price + brands) */}
                {(selectedBrandIds.length > 0 || minPrice || maxPrice) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(minPrice || maxPrice) && (
                            <Link
                                href={buildHref(current, {
                                    minPrice: '',
                                    maxPrice: '',
                                })}
                                className="inline-flex items-center gap-1.5 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-medium text-(--brand)"
                            >
                                ${minPrice || '0'} – ${maxPrice || '∞'}
                                <span className="text-sm leading-none">×</span>
                            </Link>
                        )}
                        {selectedBrandIds.map((id) => {
                            const b = brands.find((x) => x.id === id);
                            if (!b) return null;
                            const remaining = selectedBrandIds
                                .filter((x) => x !== id)
                                .join(',');
                            return (
                                <Link
                                    key={id}
                                    href={buildHref(current, {
                                        brandIds: remaining,
                                    })}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-medium text-(--brand)"
                                >
                                    {b.name}
                                    <span className="text-sm leading-none">
                                        ×
                                    </span>
                                </Link>
                            );
                        })}
                        <Link
                            href={buildHref(current, {
                                brandIds: '',
                                minPrice: '',
                                maxPrice: '',
                            })}
                            className="text-xs font-medium text-zinc-500 underline hover:text-(--brand) dark:text-zinc-400"
                        >
                            {tr(lang, 'clearFilters')}
                        </Link>
                    </div>
                )}

                <Suspense
                    key={resultsKey}
                    fallback={<ProductGridSkeleton colClass={colClass} />}
                >
                    <ProductResults
                        lang={lang}
                        query={query}
                        curatedView={curatedView}
                        search={search}
                        colClass={colClass}
                    />
                </Suspense>
            </div>
        </>
    );
}

/** The product list — fetched fresh and streamed in behind a skeleton. */
async function ProductResults({
    lang,
    query,
    curatedView,
    search,
    colClass,
}: {
    lang: Lang;
    query: ProductQuery;
    curatedView: string;
    search: string;
    colClass: string;
}) {
    const isBest = curatedView === 'best-selling';
    const result = isBest
        ? null
        : await getProducts(query, { fresh: true }).catch(() => null);
    const best = isBest ? await getBestSellers(24).catch(() => []) : [];
    const products = isBest ? best : (result?.data ?? []);
    const total = isBest ? best.length : (result?.total ?? 0);

    if (products.length === 0) {
        return (
            <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 px-6 py-20 text-center dark:border-zinc-700">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <SearchX className="size-8 text-zinc-400" />
                </span>
                <p className="mt-4 font-semibold text-zinc-800 dark:text-zinc-100">
                    {tr(lang, 'noProducts')}
                </p>
                {search && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        “{search}”
                    </p>
                )}
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'tryDifferent')}
                </p>
                <Link
                    href="/products"
                    className="mt-5 rounded-full bg-(--brand) px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 hover:opacity-90"
                >
                    {tr(lang, 'clearFilters')}
                </Link>
            </div>
        );
    }

    const totalPages = isBest ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="mt-6">
            <div className={`stagger grid gap-(--ui-gap) ${colClass}`}>
                {products.map((p) => (
                    <ProductCard key={p.id} product={p} lang={lang} />
                ))}
            </div>
            <Pagination
                page={query.page ?? 1}
                totalPages={totalPages}
                lang={lang}
            />
        </div>
    );
}

/** Dashboard-configured sections for the products page (base view only). */
async function ConfiguredSections({
    sections,
    lang,
    categories,
    config,
}: {
    sections: HomeSection[];
    lang: Lang;
    categories: Category[];
    config: StoreConfig;
}) {
    const latest = sections.some((s) => s.type === 'new-arrivals')
        ? ((
              await getProducts({
                  limit: 12,
                  sortBy: 'createdAt',
                  sortOrder: 'DESC',
              }).catch(() => null)
          )?.data ?? [])
        : [];
    const sectionProducts = await resolveSectionProducts(
        sections,
        latest,
        getProducts,
    );
    return (
        <div className="border-b border-zinc-100 dark:border-zinc-800">
            {sections.map((section) => (
                <SectionBlock
                    key={section.id}
                    section={section}
                    lang={lang}
                    categories={categories}
                    products={sectionProducts.get(section.id) ?? []}
                    columns={config.appearance.productColumns}
                />
            ))}
        </div>
    );
}

function SectionsSkeleton({ colClass }: { colClass: string }) {
    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className={`mt-5 grid gap-(--ui-gap) ${colClass}`}>
                <ProductCardSkeletons count={5} />
            </div>
        </div>
    );
}
