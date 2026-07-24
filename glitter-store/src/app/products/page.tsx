import Link from 'next/link';
import { ChevronRight, Flame, LayoutGrid, PackagePlus, SearchX } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { ProductFilters } from '@/components/product-filters';
import { ProductSearch } from '@/components/product-search';
import { SectionBlock } from '@/components/home-section';
import { resolveSectionProducts } from '@/components/home-section-data';
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
import { productGridClass } from '@/lib/store-config';
import { Tr, T } from '@/lib/lang-context';
import { pick, tr } from '@/lib/locale';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Shop' };

// Always render fresh from the API — never serve a cached page/badge state.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const PAGE_SIZE = 12;

type SortKey =
    | 'newest'
    | 'price-asc'
    | 'price-desc'
    | 'name'
    | 'rating';

const SORTS: {
    key: SortKey;
    trKey: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}[] = [
    { key: 'newest', trKey: 'newest', sortBy: 'createdAt', sortOrder: 'DESC' },
    { key: 'price-asc', trKey: 'priceLow', sortBy: 'price', sortOrder: 'ASC' },
    { key: 'price-desc', trKey: 'priceHigh', sortBy: 'price', sortOrder: 'DESC' },
    { key: 'name', trKey: 'nameAZ', sortBy: 'nameEn', sortOrder: 'ASC' },
    { key: 'rating', trKey: 'topRated', sortBy: 'averageRating', sortOrder: 'DESC' },
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
    if (merged.sort && merged.sort !== 'newest') params.set('sort', merged.sort);
    if (overrides.page && overrides.page > 1) params.set('page', String(overrides.page));
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
    const sort =
        (first(sp.sort) as SortKey) || config.appearance.productSort;
    const view = first(sp.view) ?? '';
    const page = Math.max(1, Number(first(sp.page)) || 1);
    // "Best sellers" is a curated popularity ranking (its own endpoint), so it
    // only applies to the unfiltered base view.
    const wantBest =
        view === 'best-selling' && !search && !categoryId && !brandIds;

    // "New arrivals" is always newest-first, regardless of the default sort.
    const sortDef =
        view === 'new-arrivals'
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

    const [result, best, categories, brands] = await Promise.all([
        wantBest ? Promise.resolve(null) : getProducts(query).catch(() => null),
        wantBest ? getBestSellers(24).catch(() => []) : Promise.resolve([]),
        getCategories().catch(() => []),
        getActiveBrands().catch(() => []),
    ]);

    const products = wantBest ? best : (result?.data ?? []);
    const total = wantBest ? best.length : (result?.total ?? 0);
    const totalPages = wantBest ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));
    const colClass = productGridClass(config.appearance.productColumns);

    // Contextual heading so shoppers know what list they're viewing after
    // tapping a section's "View all" (best sellers, new arrivals, a category…).
    const activeCategory = categoryId
        ? categories.find((c) => c.id === categoryId)
        : null;
    const headingNode = search ? (
        <>
            <Tr k="resultsFor" /> “{search}”
        </>
    ) : activeCategory ? (
        <T en={activeCategory.nameEn} km={activeCategory.nameKm} />
    ) : (
        <Tr
            k={
                view === 'best-selling'
                    ? 'bestSellers'
                    : view === 'new-arrivals'
                      ? 'newArrivals'
                      : 'allProducts'
            }
        />
    );

    // Curated views (best sellers / new arrivals) are a fixed list — showing
    // sort/filter controls there is contradictory, so we hide them and offer a
    // link back to the full shop instead.
    const isCurated = view === 'best-selling' || view === 'new-arrivals';

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
    const latest = productSections.some((s) => s.type === 'new-arrivals')
        ? ((
              await getProducts({
                  limit: 12,
                  sortBy: 'createdAt',
                  sortOrder: 'DESC',
              }).catch(() => null)
          )?.data ?? [])
        : [];
    const sectionProducts = await resolveSectionProducts(
        productSections,
        latest,
        getProducts,
    );

    return (
        <>
            {productSections.length > 0 && (
                <div className="border-b border-zinc-100">
                    {productSections.map((section) => (
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
            )}
            <div className="mx-auto max-w-6xl px-4 py-6">
                {/* Contextual heading — tells shoppers which list this is.
                    Curated lists (from a home-page "View all") get a hero. */}
                {isCurated ? (
                    <div className="relative mb-6 overflow-hidden rounded-3xl border border-(--brand)/15 bg-linear-to-br from-(--brand)/12 via-(--brand)/5 to-transparent p-6 sm:p-8">
                        <div className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full bg-(--brand)/15 blur-3xl" />
                        <div className="relative flex items-center gap-4">
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-(--brand) text-white shadow-lg shadow-(--brand)/30">
                                {view === 'best-selling' ? (
                                    <Flame className="size-7" />
                                ) : (
                                    <PackagePlus className="size-7" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                                    <Tr
                                        k={
                                            view === 'best-selling'
                                                ? 'bestSellers'
                                                : 'newArrivals'
                                        }
                                    />
                                </h1>
                                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                                    <Tr
                                        k={
                                            view === 'best-selling'
                                                ? 'bestSellersSub'
                                                : 'newArrivalsSub'
                                        }
                                    />
                                </p>
                                {total > 0 && (
                                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-(--brand)">
                                        {total} <Tr k="products" />
                                    </span>
                                )}
                            </div>
                            <Link
                                href="/products"
                                className="hidden shrink-0 items-center gap-1 self-start rounded-full bg-white/80 px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur transition-colors hover:text-(--brand) sm:inline-flex dark:bg-zinc-900/70 dark:text-zinc-200"
                            >
                                {tr(lang, 'allProducts')}
                                <ChevronRight className="size-3.5" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 flex items-center gap-2.5">
                        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            <span className="h-5 w-1 rounded-full bg-(--brand)" />
                            {headingNode}
                        </h1>
                        {total > 0 && (
                            <span className="text-sm font-medium text-zinc-400">
                                {total}
                            </span>
                        )}
                    </div>
                )}

                {/* Curated lists hide the filters, so give mobile a clear way
                    back to the full shop. */}
                {isCurated && (
                    <Link
                        href="/products"
                        className="mb-4 flex w-full items-center justify-center gap-1 rounded-full border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-(--brand)/40 hover:text-(--brand) sm:hidden dark:border-zinc-700 dark:text-zinc-200"
                    >
                        {tr(lang, 'allProducts')}
                        <ChevronRight className="size-3.5" />
                    </Link>
                )}

                {/* Search + filters — hidden on curated best-seller / new-arrival
                    lists where sorting/filtering wouldn't make sense. */}
                {!isCurated && (
                    <div className="flex items-center gap-3">
                        <ProductSearch />
                        <ProductFilters
                            brands={brands.map((b) => ({
                                id: b.id,
                                name: b.name,
                                logo: fileUrl(b.logoUrl),
                            }))}
                            sortOptions={SORTS.map((s) => ({
                                key: s.key,
                                label: tr(lang, s.trKey),
                            }))}
                            labels={{
                                filters: tr(lang, 'filters'),
                                sortBy: tr(lang, 'sortBy'),
                                brands: tr(lang, 'brands'),
                                searchBrands: tr(lang, 'searchBrands'),
                                noBrands: tr(lang, 'noBrands'),
                                clear: tr(lang, 'clear'),
                                apply: tr(lang, 'apply'),
                                selected: tr(lang, 'selected'),
                                price: tr(lang, 'price'),
                                minPrice: tr(lang, 'min'),
                                maxPrice: tr(lang, 'max'),
                            }}
                        />
                    </div>
                )}

                {/* Category chips */}
                {!isCurated && (
                <div className="mt-5 flex gap-2.5 overflow-x-auto pb-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
                    <Link
                        href={buildHref(current, { categoryId: '' })}
                        className={cn(
                            'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                            !categoryId
                                ? 'bg-(--brand) text-white shadow-lg shadow-(--brand)/30'
                                : 'bg-white text-zinc-600 border border-zinc-200 dark:border-zinc-700 hover:text-(--brand) hover:border-(--brand)/40 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800',
                        )}
                    >
                        <LayoutGrid className="size-4" />
                        <Tr k="all" />
                    </Link>
                    {categories.map((c) => {
                        const active = categoryId === c.id;
                        const icon = fileUrl(c.iconUrl);
                        const cname = pick(lang, c.nameEn, c.nameKm);
                        return (
                            <Link
                                key={c.id}
                                href={buildHref(current, { categoryId: c.id })}
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-all',
                                    active
                                        ? 'bg-(--brand)/75 dark:bg-(--brand)/25 text-white shadow-lg shadow-(--brand)/30'
                                        : 'bg-white text-zinc-600 border border-zinc-200 dark:border-zinc-700 hover:text-(--brand) hover:border-(--brand)/40 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-6 items-center justify-center overflow-hidden p-0.5'
                                    )}
                                >
                                    {icon ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={icon}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <span
                                            className={cn(
                                                'text-xs font-bold',
                                                active
                                                    ? 'text-white'
                                                    : 'text-(--brand)',
                                            )}
                                        >
                                            {cname.charAt(0)}
                                        </span>
                                    )}
                                </span>
                                <T en={c.nameEn} km={c.nameKm} />
                            </Link>
                        );
                    })}
                </div>
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
                                    <span className="text-sm leading-none">×</span>
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

                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {search ? (
                        <>
                            <Tr k="results" /> “{search}” ·{' '}
                        </>
                    ) : (
                        ''
                    )}
                    {total} <Tr k="products" />
                </p>

                <div className="mt-4">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20 text-center dark:border-zinc-700">
                            <SearchX className="size-10 text-zinc-300 dark:text-zinc-600" />
                            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-200">
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
                                className="mt-4 rounded-full bg-(--brand) px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                            >
                                {tr(lang, 'clearFilters')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div
                                className={`stagger grid gap-(--ui-gap) ${colClass}`}
                            >
                                {products.map((p) => (
                                    <ProductCard key={p.id} product={p} lang={lang} />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-center gap-2">
                                    {page > 1 && (
                                        <Link
                                            href={buildHref(current, { page: page - 1 })}
                                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                                        >
                                            {tr(lang, 'previous')}
                                        </Link>
                                    )}
                                    <span className="px-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        {tr(lang, 'page')} {page} {tr(lang, 'of')}{' '}
                                        {totalPages}
                                    </span>
                                    {page < totalPages && (
                                        <Link
                                            href={buildHref(current, { page: page + 1 })}
                                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                                        >
                                            {tr(lang, 'next')}
                                        </Link>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
