import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import {
    getActiveBrands,
    getCategories,
    getProducts,
    type ProductQuery,
} from '@/lib/api';
import { getLang, pick, tr } from '@/lib/locale';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Shop' };

const PAGE_SIZE = 12;

type SortKey = 'newest' | 'price-asc' | 'price-desc';

const SORTS: {
    key: SortKey;
    trKey: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}[] = [
    { key: 'newest', trKey: 'newest', sortBy: 'createdAt', sortOrder: 'DESC' },
    { key: 'price-asc', trKey: 'priceLow', sortBy: 'price', sortOrder: 'ASC' },
    { key: 'price-desc', trKey: 'priceHigh', sortBy: 'price', sortOrder: 'DESC' },
];

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

function buildHref(
    current: { search?: string; categoryId?: string; brandId?: string; sort?: string },
    overrides: Partial<{ search: string; categoryId: string; brandId: string; sort: string; page: number }>,
): string {
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (merged.search) params.set('search', merged.search);
    if (merged.categoryId) params.set('categoryId', merged.categoryId);
    if (merged.brandId) params.set('brandId', merged.brandId);
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
    const [sp, lang] = await Promise.all([searchParams, getLang()]);
    const search = first(sp.search) ?? '';
    const categoryId = first(sp.categoryId) ?? '';
    const brandId = first(sp.brandId) ?? '';
    const sort = (first(sp.sort) as SortKey) || 'newest';
    const page = Math.max(1, Number(first(sp.page)) || 1);

    const sortDef = SORTS.find((s) => s.key === sort) ?? SORTS[0];
    const current = { search, categoryId, brandId, sort };

    const query: ProductQuery = {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
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

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        {tr(lang, 'shop')}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        {search ? `${tr(lang, 'results')} “${search}” · ` : ''}
                        {total} {tr(lang, 'products')}
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {SORTS.map((s) => (
                        <Link
                            key={s.key}
                            href={buildHref(current, { sort: s.key })}
                            className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                s.key === sort
                                    ? 'border-(--brand) bg-pink-50 text-(--brand)'
                                    : 'border-zinc-200 text-zinc-600 hover:border-(--brand)',
                            )}
                        >
                            {tr(lang, s.trKey)}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
                <aside className="space-y-6">
                    <FilterGroup
                        title={tr(lang, 'categories')}
                        allLabel={tr(lang, 'all')}
                        allHref={buildHref(current, { categoryId: '' })}
                        allActive={!categoryId}
                        items={categories.map((c) => ({
                            id: c.id,
                            label: pick(lang, c.nameEn, c.nameKm),
                            href: buildHref(current, { categoryId: c.id }),
                            active: categoryId === c.id,
                        }))}
                    />
                    <FilterGroup
                        title={tr(lang, 'brands')}
                        allLabel={tr(lang, 'all')}
                        allHref={buildHref(current, { brandId: '' })}
                        allActive={!brandId}
                        items={brands.map((b) => ({
                            id: b.id,
                            label: b.name,
                            href: buildHref(current, { brandId: b.id }),
                            active: brandId === b.id,
                        }))}
                    />
                </aside>

                <div>
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20 text-center">
                            <p className="font-medium text-zinc-700">
                                {tr(lang, 'noProducts')}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
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
                            <div className="grid grid-cols-2 gap-(--ui-gap) sm:grid-cols-3">
                                {products.map((p) => (
                                    <ProductCard key={p.id} product={p} lang={lang} />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-8 flex items-center justify-center gap-2">
                                    {page > 1 && (
                                        <Link
                                            href={buildHref(current, { page: page - 1 })}
                                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-(--brand)"
                                        >
                                            {tr(lang, 'previous')}
                                        </Link>
                                    )}
                                    <span className="px-2 text-sm text-zinc-500">
                                        {tr(lang, 'page')} {page} {tr(lang, 'of')}{' '}
                                        {totalPages}
                                    </span>
                                    {page < totalPages && (
                                        <Link
                                            href={buildHref(current, { page: page + 1 })}
                                            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-(--brand)"
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
        </div>
    );
}

function FilterGroup({
    title,
    allLabel,
    allHref,
    allActive,
    items,
}: {
    title: string;
    allLabel: string;
    allHref: string;
    allActive: boolean;
    items: { id: string; label: string; href: string; active: boolean }[];
}) {
    if (items.length === 0) return null;
    return (
        <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {title}
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
                <li>
                    <Link
                        href={allHref}
                        className={cn(
                            'block rounded-md px-2 py-1.5 transition-colors',
                            allActive
                                ? 'bg-pink-50 font-medium text-(--brand)'
                                : 'text-zinc-600 hover:bg-zinc-50',
                        )}
                    >
                        {allLabel}
                    </Link>
                </li>
                {items.map((it) => (
                    <li key={it.id}>
                        <Link
                            href={it.href}
                            className={cn(
                                'block rounded-md px-2 py-1.5 transition-colors',
                                it.active
                                    ? 'bg-pink-50 font-medium text-(--brand)'
                                    : 'text-zinc-600 hover:bg-zinc-50',
                            )}
                        >
                            {it.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
