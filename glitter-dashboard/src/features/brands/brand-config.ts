import type { TranslationKey } from '@/lib/i18n';
import type { BrandSortBy, BrandSortOrder, BrandStatus } from '@/types/brand';

export type BrandStatusFilter = BrandStatus | 'all';

export interface BrandSortOptionConfig {
    value: string;
    labelKey: TranslationKey;
    sortBy: BrandSortBy;
    sortOrder: BrandSortOrder;
}

export interface BrandFilterOptionConfig {
    value: BrandStatusFilter;
    labelKey: TranslationKey;
}

export const BRAND_FILTER_OPTIONS: BrandFilterOptionConfig[] = [
    { value: 'all', labelKey: 'brand.status.all' },
    { value: 'active', labelKey: 'brand.status.active' },
    { value: 'inactive', labelKey: 'brand.status.inactive' },
];

export const BRAND_SORT_OPTIONS: BrandSortOptionConfig[] = [
    {
        value: 'createdAt-DESC',
        labelKey: 'brand.sort.newest',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    },
    {
        value: 'createdAt-ASC',
        labelKey: 'brand.sort.oldest',
        sortBy: 'createdAt',
        sortOrder: 'ASC',
    },
    {
        value: 'name-ASC',
        labelKey: 'brand.sort.nameAsc',
        sortBy: 'name',
        sortOrder: 'ASC',
    },
    {
        value: 'name-DESC',
        labelKey: 'brand.sort.nameDesc',
        sortBy: 'name',
        sortOrder: 'DESC',
    },
    {
        value: 'updatedAt-DESC',
        labelKey: 'brand.sort.recentlyUpdated',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
    },
];

export const DEFAULT_BRAND_SORT = BRAND_SORT_OPTIONS[0];