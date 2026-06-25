import type {
    Banner,
    Branch,
    Brand,
    Category,
    MenuItem,
    Page,
    Paginated,
    Product,
    ProductAvailability,
    Review,
    ReviewSummary,
} from './types';
import {
    DEFAULT_STORE_CONFIG,
    mergeStoreConfig,
    type StoreConfig,
} from './store-config';

export const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** Resolve a stored file path to an absolute URL on the API host. */
export function fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function formatPrice(value: number | string | null | undefined): string {
    const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
    return `$${(Number.isFinite(n) ? (n as number) : 0).toFixed(2)}`;
}

/**
 * Server-side fetch. Defaults to always-fresh (revalidate 0) so that a live
 * `router.refresh()` triggered by the SSE stream always serves new data.
 */
async function apiGet<T>(path: string, revalidate = 0): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        next: { revalidate },
    });
    if (!res.ok) {
        throw new Error(`API request failed (${res.status}): ${path}`);
    }
    return res.json() as Promise<T>;
}

export interface ProductQuery {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export async function getProducts(
    query: ProductQuery = {},
): Promise<Paginated<Product>> {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 12));
    params.set('status', 'active');
    if (query.search) params.set('search', query.search);
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.brandId) params.set('brandId', query.brandId);
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    // Cache briefly so toggling language / re-renders don't re-hit the API.
    return apiGet<Paginated<Product>>(
        `/api/products?${params.toString()}`,
        30,
    );
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
        const res = await apiGet<{ data: Product }>(
            `/api/products/slug/${encodeURIComponent(slug)}`,
            30,
        );
        return res.data;
    } catch {
        return null;
    }
}

export async function getCategories(): Promise<Category[]> {
    const res = await apiGet<Paginated<Category>>(
        `/api/categories?limit=100`,
        300,
    );
    return res.data ?? [];
}

export async function getActiveBrands(): Promise<Brand[]> {
    const res = await apiGet<{ data: Brand[] }>(`/api/brands/status/active`, 300);
    return res.data ?? [];
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
    try {
        const res = await apiGet<{ data: Product[] }>(
            `/api/products/best-selling?limit=${limit}`,
            120,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

export async function getActiveBranches(): Promise<Branch[]> {
    try {
        const res = await apiGet<{ data: Branch[] }>(
            `/api/branches/status/active`,
            300,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

/** Approved reviews for a product, with the rating summary. */
export async function getProductReviews(
    productId: string,
): Promise<{ data: Review[]; summary: ReviewSummary }> {
    try {
        return await apiGet<{ data: Review[]; summary: ReviewSummary }>(
            `/api/reviews/product/${productId}`,
        );
    } catch {
        return { data: [], summary: { average: 0, count: 0 } };
    }
}

/** Active hero banners for the storefront carousel. */
export async function getBanners(
    location = 'home_hero',
): Promise<Banner[]> {
    try {
        const res = await apiGet<{ data: Banner[] }>(
            `/api/banners/placement/${location}`,
            0,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

/** Active "you may also like" products for a product detail page. */
export async function getRelatedProducts(
    productId: string,
): Promise<Product[]> {
    try {
        const res = await apiGet<{ data: Product[] }>(
            `/api/related-products/product/${productId}/active`,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

/** A custom CMS page by slug (or null if missing). */
export async function getPage(slug: string): Promise<Page | null> {
    try {
        const res = await apiGet<{ data: Page }>(
            `/api/pages/slug/${encodeURIComponent(slug)}`,
        );
        return res.data ?? null;
    } catch {
        return null;
    }
}

/** Active storefront navigation links (header + footer), ordered. */
export async function getMenu(): Promise<MenuItem[]> {
    try {
        const res = await apiGet<{ data: MenuItem[] }>(
            `/api/menu?isActive=true`,
            300,
        );
        return (res.data ?? []).sort(
            (a, b) => a.displayOrder - b.displayOrder,
        );
    } catch {
        return [];
    }
}

interface RawSetting {
    settingGroup: string;
    settingKey: string;
    settingValue: string;
    isPublic: boolean;
}

/** Public storefront config (bilingual JSON), set from the dashboard App Settings page. */
export async function getStoreConfig(): Promise<StoreConfig> {
    try {
        // Fetch just the one public config row (not the whole settings table).
        const row = await apiGet<RawSetting | null>(
            `/api/app-settings/group/storefront/key/home_config`,
            0,
        );
        if (!row?.settingValue) return DEFAULT_STORE_CONFIG;
        return mergeStoreConfig(JSON.parse(row.settingValue));
    } catch {
        return DEFAULT_STORE_CONFIG;
    }
}

export async function getAvailability(
    productId: string,
): Promise<ProductAvailability | null> {
    try {
        const res = await apiGet<{ data: ProductAvailability }>(
            `/api/inventory-branch/product/${productId}/availability`,
        );
        return res.data;
    } catch {
        return null;
    }
}
