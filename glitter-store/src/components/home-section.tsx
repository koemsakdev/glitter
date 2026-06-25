import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { fileUrl, getBestSellers } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import {
    productGridClass,
    type HomeSection,
    type ProductColumns,
} from '@/lib/store-config';
import type { Category, Product } from '@/lib/types';

/**
 * Renders a single configured storefront section. `products` is the resolved
 * product list for product-grid sections (new-arrivals / category-products).
 */
export function SectionBlock({
    section,
    lang,
    categories,
    products,
    columns = '4',
}: {
    section: HomeSection;
    lang: Lang;
    categories: Category[];
    products: Product[];
    columns?: ProductColumns;
}) {
    const title = pick(lang, section.titleEn, section.titleKm);

    if (section.type === 'categories') {
        if (categories.length === 0) return null;
        return (
            <section className="mx-auto max-w-6xl px-4 py-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h2>
                    <Link
                        href="/products"
                        className="text-sm font-medium text-(--brand) hover:underline"
                    >
                        {tr(lang, 'viewAll')}
                    </Link>
                </div>
                <div className="stagger mt-5 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible lg:grid-cols-8 [&::-webkit-scrollbar]:hidden">
                    {categories.map((c) => {
                        const icon = fileUrl(c.iconUrl);
                        const cname = pick(lang, c.nameEn, c.nameKm);
                        return (
                            <Link
                                key={c.id}
                                href={`/products?categoryId=${c.id}`}
                                className="group flex w-16 shrink-0 flex-col items-center gap-2 sm:w-auto"
                            >
                                <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-linear-to-br from-pink-50 to-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-(--brand) group-hover:shadow-md dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
                                    {icon ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={icon}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xl font-bold text-(--brand)">
                                            {cname.charAt(0)}
                                        </span>
                                    )}
                                </span>
                                <span className="line-clamp-1 max-w-16 text-center text-xs font-medium text-zinc-600 transition-colors group-hover:text-(--brand) dark:text-zinc-400 sm:max-w-full">
                                    {cname}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        );
    }

    // Product grids: new-arrivals & category-products
    const viewAllHref =
        section.type === 'category-products' && section.categoryId
            ? `/products?categoryId=${section.categoryId}`
            : '/products';

    return (
        <section className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                <Link
                    href={viewAllHref}
                    className="text-sm font-medium text-(--brand) hover:underline"
                >
                    {tr(lang, 'viewAll')}
                </Link>
            </div>
            {products.length === 0 ? (
                <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'noProducts')}
                </p>
            ) : (
                <div
                    className={`stagger mt-5 grid gap-(--ui-gap) ${productGridClass(columns)}`}
                >
                    {products.map((p) => (
                        <ProductCard key={p.id} product={p} lang={lang} />
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * Resolve the product list for each product-grid section. Returns a map of
 * section id → products. `latest` is shared by all new-arrivals sections.
 */
export async function resolveSectionProducts(
    sections: HomeSection[],
    latest: Product[],
    getProducts: (q: {
        categoryId?: string;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }) => Promise<{ data: Product[] } | null>,
): Promise<Map<string, Product[]>> {
    const map = new Map<string, Product[]>();

    for (const s of sections) {
        if (s.type === 'new-arrivals') {
            map.set(s.id, latest.slice(0, s.limit ?? 8));
        }
    }

    const catSections = sections.filter(
        (s) => s.type === 'category-products' && s.categoryId,
    );
    const results = await Promise.all(
        catSections.map((s) =>
            getProducts({
                categoryId: s.categoryId,
                limit: s.limit ?? 8,
                sortBy: 'createdAt',
                sortOrder: 'DESC',
            }).catch(() => null),
        ),
    );
    catSections.forEach((s, i) => map.set(s.id, results[i]?.data ?? []));

    const bestSections = sections.filter((s) => s.type === 'best-selling');
    const bestResults = await Promise.all(
        bestSections.map((s) => getBestSellers(s.limit ?? 8).catch(() => [])),
    );
    bestSections.forEach((s, i) => map.set(s.id, bestResults[i]));

    return map;
}
