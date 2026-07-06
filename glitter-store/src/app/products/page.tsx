import Link from 'next/link';
import { LayoutGrid, SearchX } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { ProductFilters } from '@/components/product-filters';
import { ProductSearch } from '@/components/product-search';
import { SectionBlock, resolveSectionProducts } from '@/components/home-section';
import {
    fileUrl,
    getActiveBrands,
    getCategories,
    getProducts,
    getStoreConfig,
    type ProductQuery,
} from '@/lib/api';
import { getLang } from '@/lib/lang';
import { productGridClass } from '@/lib/store-config';
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
        sort?: string;
    },
    overrides: Partial<{
        search: string;
        categoryId: string;
        brandIds: string;
        sort: string;
        page: number;
    }>,
): string {
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (merged.search) params.set('search', merged.search);
    if (merged.categoryId) params.set('categoryId', merged.categoryId);
    if (merged.brandIds) params.set('brandIds', merged.brandIds);
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
    const sort =
        (first(sp.sort) as SortKey) || config.appearance.productSort;
    const page = Math.max(1, Number(first(sp.page)) || 1);

    const sortDef = SORTS.find((s) => s.key === sort) ?? SORTS[0];
    const current = { search, categoryId, brandIds, sort };

    const query: ProductQuery = {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandIds: brandIds || undefined,
        sortBy: sortDef.sortBy,
        sortOrder: sortDef.sortOrder,
    };

    const [result, categories, brands] = await Promise.all([
        getProducts(query).catch(() => null),
        getCategories().catch(() => []),
        getActiveBrands().catch(() => []),
    ]);

    const products = result?.data ?? [];
    const total = result?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const colClass = productGridClass(config.appearance.productColumns);

    // Configured sections for this page — only on the unfiltered base view.
    const isBaseView =
        !search && !categoryId && !brandIds && page === 1;
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
                {/* Search + filters */}
                <div className="flex items-center gap-3">
                    <ProductSearch placeholder={tr(lang, 'search')} />
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
                        }}
                    />
                </div>

                {/* Category chips */}
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
                        {tr(lang, 'all')}
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
                                {cname}
                            </Link>
                        );
                    })}
                </div>

                {/* Selected brand chips */}
                {selectedBrandIds.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                            href={buildHref(current, { brandIds: '' })}
                            className="text-xs font-medium text-zinc-500 underline hover:text-(--brand) dark:text-zinc-400"
                        >
                            {tr(lang, 'clearFilters')}
                        </Link>
                    </div>
                )}

                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {search ? `${tr(lang, 'results')} “${search}” · ` : ''}
                    {total} {tr(lang, 'products')}
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
