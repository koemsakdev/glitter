'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { fileUrl } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
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
 * A client component (still SSR'd on first load) so language switches instantly.
 */
export function SectionBlock({
    section,
    lang: initialLang,
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
    const { lang } = useLang(initialLang);
    const title = pick(lang, section.titleEn, section.titleKm);

    if (section.type === 'categories') {
        if (categories.length === 0) return null;
        return (
            <section className="mx-auto max-w-6xl px-4 py-8">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        <span className="h-5 w-1 rounded-full bg-(--brand)" />
                        {title}
                    </h2>
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-(--brand)/10 hover:text-(--brand) dark:bg-zinc-800 dark:text-zinc-200"
                    >
                        {tr(lang, 'viewAll')}
                        <ChevronRight className="size-3.5" />
                    </Link>
                </div>
                <div className="stagger mt-6 flex gap-3.5 overflow-x-auto pb-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden sm:gap-4">
                    {categories.map((c) => {
                        const icon = fileUrl(c.iconUrl);
                        const cname = pick(lang, c.nameEn, c.nameKm);
                        return (
                            <Link
                                key={c.id}
                                href={`/products?categoryId=${c.id}`}
                                className="group flex w-[5rem] shrink-0 flex-col items-center gap-2.5 sm:w-[5.5rem]"
                            >
                                {/* Soft brand-tinted rounded tile; icon shown in full */}
                                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.4rem] bg-linear-to-br from-(--brand)/12 via-(--brand)/5 to-transparent p-3.5 ring-1 ring-(--brand)/10 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-(--brand)/15 group-hover:ring-(--brand)/40 group-active:scale-95 dark:from-(--brand)/20 dark:via-(--brand)/8 dark:ring-white/10">
                                    {/* subtle sheen */}
                                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/50 to-transparent dark:from-white/10" />
                                    {icon ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={icon}
                                            alt=""
                                            className="relative size-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                                        />
                                    ) : (
                                        <span className="relative text-2xl font-bold text-(--brand)">
                                            {cname.charAt(0)}
                                        </span>
                                    )}
                                </span>

                                <span className="line-clamp-1 w-full text-center text-xs font-semibold text-zinc-700 transition-colors group-hover:text-(--brand) dark:text-zinc-300">
                                    {cname}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        );
    }

    // Product grids: new-arrivals, best-selling & category-products. Carry the
    // section's intent to the products page so it can show the right heading
    // (and, for best-sellers, the popularity-ranked list) instead of a plain
    // "all products" view.
    const viewAllHref =
        section.type === 'category-products' && section.categoryId
            ? `/products?categoryId=${section.categoryId}`
            : section.type === 'best-selling'
              ? '/products?view=best-selling'
              : section.type === 'new-arrivals'
                ? '/products?view=new-arrivals'
                : '/products';

    return (
        <section className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    <span className="h-5 w-1 rounded-full bg-(--brand)" />
                    {title}
                </h2>
                <Link
                    href={viewAllHref}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-(--brand)/10 hover:text-(--brand) dark:bg-zinc-800 dark:text-zinc-200"
                >
                    {tr(lang, 'viewAll')}
                    <ChevronRight className="size-3.5" />
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
