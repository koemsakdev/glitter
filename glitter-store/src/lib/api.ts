import type {
    Brand,
    Category,
    Paginated,
    Product,
    ProductAvailability,
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

/** Server-side fetch with ISR caching (revalidates every 60s by default). */
async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
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
    return apiGet<Paginated<Product>>(`/api/products?${params.toString()}`);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
    try {
        const res = await apiGet<{ data: Product }>(
            `/api/products/slug/${encodeURIComponent(slug)}`,
        );
        return res.data;
    } catch {
        return null;
    }
}

export async function getCategories(): Promise<Category[]> {
    const res = await apiGet<Paginated<Category>>(`/api/categories?limit=100`);
    return res.data ?? [];
}

export async function getActiveBrands(): Promise<Brand[]> {
    const res = await apiGet<{ data: Brand[] }>(`/api/brands/status/active`);
    return res.data ?? [];
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
            60,
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
