/** Record types that soft-delete (and so can be listed / restored). */
export const SOFT_DELETABLE = [
  'products',
  'product-variants',
  'product-images',
  'categories',
  'brands',
  'colors',
  'badges',
  'branches',
  'vouchers',
  'banners',
  'advertisements',
  'pages',
  'menu',
  'reviews',
  'shipments',
  'inventory',
  'users',
];

/**
 * Order for the automatic clean-up: children before parents, so e.g. a
 * product's variants/images go before the product, and products before the
 * category/brand they belong to.
 */
export const PURGE_ORDER = [
  'product-images',
  'inventory',
  'product-variants',
  'reviews',
  'shipments',
  'products',
  'badges',
  'colors',
  'brands',
  'categories',
  'vouchers',
  'banners',
  'advertisements',
  'pages',
  'menu',
  'users',
  'branches',
];

/** Storefront refresh event per record type (after a restore / clean-up). */
export const REALTIME: Record<string, string> = {
  products: 'products',
  'product-variants': 'products',
  'product-images': 'products',
  categories: 'categories',
  brands: 'brands',
  colors: 'colors',
  badges: 'products',
  branches: 'branches',
  banners: 'banners',
  advertisements: 'advertisements',
  pages: 'pages',
  menu: 'menu',
  reviews: 'reviews',
  vouchers: 'products',
  inventory: 'products',
};

/**
 * Days a record stays in the recycle bin before it is deleted for good.
 * RECYCLE_BIN_RETENTION_DAYS in .env, default 90 (≈ 3 months).
 */
export function recycleBinRetentionDays(): number {
  const n = Number.parseInt(process.env.RECYCLE_BIN_RETENTION_DAYS ?? '', 10);
  return Number.isInteger(n) && n >= 1 ? n : 90;
}
