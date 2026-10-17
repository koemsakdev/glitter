/**
 * Which cached storefront data each realtime event makes stale. Event names
 * come from the API's `realtime.publish(...)`; tags from `cacheTagFor` in
 * src/lib/api.ts.
 */
export const LIVE_TAGS: Record<string, string[]> = {
    products: ['products'],
    // Badges show on product cards; orders change stock counts.
    badges: ['products'],
    orders: ['products'],
    categories: ['categories', 'products'],
    brands: ['brands', 'products'],
    reviews: ['reviews', 'products'],
    banners: ['banners'],
    menu: ['menu'],
    pages: ['pages'],
    branches: ['branches'],
    'store-config': ['store-config'],
};
