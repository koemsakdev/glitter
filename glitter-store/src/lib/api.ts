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

export interface VoucherValidation {
    valid: boolean;
    reason?: string;
    /** Discount amount when valid. */
    discount?: number;
    /** Where the discount applies (order subtotal or delivery fee). */
    appliesTo?: 'order' | 'delivery';
    /** Required minimum when the failure is `min_spend`. */
    minSpend?: number;
    code?: string | null;
    nameEn?: string;
    nameKm?: string;
}

export interface PublicPromo {
    id: string;
    code: string | null;
    nameEn: string;
    nameKm: string;
    discountType: 'percent' | 'fixed';
    appliesTo: 'order' | 'delivery';
    discountValue: number;
    minSpend: number;
    maxDiscount: number | null;
    endAt: string | null;
    firstOrderOnly: boolean;
    newAccountDays: number | null;
}

/** Promos the logged-in customer is eligible for ("My Coupons"). */
export async function getMyVouchers(
    authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<PublicPromo[]> {
    try {
        const res = await authFetch('/api/account/vouchers/mine');
        if (!res.ok) return [];
        const json = (await res.json()) as { data: PublicPromo[] };
        return json.data ?? [];
    } catch {
        return [];
    }
}

/** Minimal product shape for the fast search palette. */
export interface SearchProduct {
    id: string;
    slug: string;
    nameEn: string;
    nameKm: string;
    price: number;
    originalPrice: number | null;
    totalStock: number;
    averageRating: number;
    reviewCount: number;
    imageUrl: string | null;
}

/** Fast product search for the header search palette. */
export async function searchProducts(
    q: string,
    limit = 12,
): Promise<SearchProduct[]> {
    const term = q.trim();
    if (!term) return [];
    try {
        const res = await apiGet<{ data: SearchProduct[] }>(
            `/api/products/search?q=${encodeURIComponent(term)}&limit=${limit}`,
            0,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

/** Active promotions to advertise on the storefront (public). */
export async function getActivePromotions(): Promise<PublicPromo[]> {
    try {
        // Cached briefly so the announcement bar isn't a fresh API call on every
        // page; promo edits reflect within ~30s.
        const res = await apiGet<{ data: PublicPromo[] }>(
            '/api/vouchers/active',
            30,
        );
        return res.data ?? [];
    } catch {
        return [];
    }
}

/**
 * Validate a voucher code against the cart subtotal, or (with no code) fetch
 * the best automatic promo. Never throws — returns `{ valid: false }` on error.
 */
export async function validateVoucher(
    subtotal: number,
    code?: string,
    shippingFee = 0,
): Promise<VoucherValidation> {
    try {
        const res = await fetch(`${API_URL}/api/vouchers/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subtotal,
                code: code || undefined,
                shippingFee,
            }),
        });
        if (!res.ok) return { valid: false };
        const json = (await res.json()) as { data: VoucherValidation };
        return json.data;
    } catch {
        return { valid: false };
    }
}

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
 * Server-side fetch. Defaults to always-fresh (`no-store`) so a live
 * `router.refresh()` from the SSE stream — or a manual reload — always serves
 * new data and is never pinned by Next's Data Cache. Pass a `revalidate`
 * (seconds) to opt into time-based caching for rarely-changing data.
 */
async function apiGet<T>(path: string, revalidate = 0): Promise<T> {
    const res = await fetch(
        `${API_URL}${path}`,
        revalidate === 0
            ? { cache: 'no-store' }
            : { next: { revalidate } },
    );
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
    brandIds?: string;
    minPrice?: number;
    maxPrice?: number;
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
    if (query.brandIds) params.set('brandIds', query.brandIds);
    if (query.minPrice !== undefined)
        params.set('minPrice', String(query.minPrice));
    if (query.maxPrice !== undefined)
        params.set('maxPrice', String(query.maxPrice));
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
        // Cached briefly (store branding/nav rarely changes) so it isn't a fresh
        // API round-trip on every page render — a big SSR speed-up. Admin edits
        // appear within ~1 min.
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
