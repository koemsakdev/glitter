import { getBestSellers } from '@/lib/api';
import type { HomeSection } from '@/lib/store-config';
import type { Product } from '@/lib/types';

/**
 * Resolve the product list for each product-grid section. Returns a map of
 * section id → products. `latest` is shared by all new-arrivals sections.
 *
 * Server-only (fetches data) — kept out of the client SectionBlock component so
 * that component can be a client component for instant language switching.
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
