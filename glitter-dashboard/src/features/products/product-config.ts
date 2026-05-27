import type { TranslationKey } from '@/lib/i18n';
import type {
    ProductSortBy,
    ProductSortOrder,
    ProductStatus,
    ProductType,
} from '@/types/product';

export type ProductStatusFilter = ProductStatus | 'all';
export type ProductTypeFilter = ProductType | 'all';

export interface ProductSortOptionConfig {
    value: string;
    labelKey: TranslationKey;
    sortBy: ProductSortBy;
    sortOrder: ProductSortOrder;
}

export interface ProductStatusOptionConfig {
    value: ProductStatusFilter;
    labelKey: TranslationKey;
}

export interface ProductTypeOptionConfig {
    value: ProductTypeFilter;
    labelKey: TranslationKey;
}

export const PRODUCT_STATUS_OPTIONS: ProductStatusOptionConfig[] = [
    { value: 'all', labelKey: 'product.status.all' },
    { value: 'active', labelKey: 'product.status.active' },
    { value: 'draft', labelKey: 'product.status.draft' },
    { value: 'out_of_stock', labelKey: 'product.status.outOfStock' },
    { value: 'discontinued', labelKey: 'product.status.discontinued' },
    { value: 'archived', labelKey: 'product.status.archived' },
];

export const PRODUCT_TYPE_OPTIONS: ProductTypeOptionConfig[] = [
    { value: 'all', labelKey: 'product.type.all' },
    { value: 'standard', labelKey: 'product.type.standard' },
    { value: 'featured', labelKey: 'product.type.featured' },
    { value: 'limited', labelKey: 'product.type.limited' },
    { value: 'exclusive', labelKey: 'product.type.exclusive' },
];

export const PRODUCT_SORT_OPTIONS: ProductSortOptionConfig[] = [
    {
        value: 'createdAt-DESC',
        labelKey: 'product.sort.newest',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    },
    {
        value: 'createdAt-ASC',
        labelKey: 'product.sort.oldest',
        sortBy: 'createdAt',
        sortOrder: 'ASC',
    },
    {
        value: 'price-ASC',
        labelKey: 'product.sort.priceLowToHigh',
        sortBy: 'price',
        sortOrder: 'ASC',
    },
    {
        value: 'price-DESC',
        labelKey: 'product.sort.priceHighToLow',
        sortBy: 'price',
        sortOrder: 'DESC',
    },
    {
        value: 'nameEn-ASC',
        labelKey: 'product.sort.nameAsc',
        sortBy: 'nameEn',
        sortOrder: 'ASC',
    },
    {
        value: 'nameEn-DESC',
        labelKey: 'product.sort.nameDesc',
        sortBy: 'nameEn',
        sortOrder: 'DESC',
    },
    {
        value: 'averageRating-DESC',
        labelKey: 'product.sort.topRated',
        sortBy: 'averageRating',
        sortOrder: 'DESC',
    },
    {
        value: 'updatedAt-DESC',
        labelKey: 'product.sort.recentlyUpdated',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
    },
];

export const DEFAULT_PRODUCT_SORT = PRODUCT_SORT_OPTIONS[0];