import type { TranslationKey } from '@/lib/i18n';
import type {
    CategorySortBy,
    CategorySortOrder,
    CategoryType,
} from '@/types/category';

export type CategoryTypeFilter = CategoryType | 'all';

export interface CategorySortOptionConfig {
    value: string;
    labelKey: TranslationKey;
    sortBy: CategorySortBy;
    sortOrder: CategorySortOrder;
}

export interface CategoryFilterOptionConfig {
    value: CategoryTypeFilter;
    labelKey: TranslationKey;
}

export const CATEGORY_FILTER_OPTIONS: CategoryFilterOptionConfig[] = [
    { value: 'all', labelKey: 'category.type.all' },
    { value: 'main', labelKey: 'category.type.main' },
    { value: 'sub', labelKey: 'category.type.sub' },
    { value: 'featured', labelKey: 'category.type.featured' },
];

export const CATEGORY_SORT_OPTIONS: CategorySortOptionConfig[] = [
    {
        value: 'displayOrder-ASC',
        labelKey: 'category.sort.displayOrderAsc',
        sortBy: 'displayOrder',
        sortOrder: 'ASC',
    },
    {
        value: 'displayOrder-DESC',
        labelKey: 'category.sort.displayOrderDesc',
        sortBy: 'displayOrder',
        sortOrder: 'DESC',
    },
    {
        value: 'createdAt-DESC',
        labelKey: 'category.sort.newest',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    },
    {
        value: 'createdAt-ASC',
        labelKey: 'category.sort.oldest',
        sortBy: 'createdAt',
        sortOrder: 'ASC',
    },
    {
        value: 'nameEn-ASC',
        labelKey: 'category.sort.nameEnAsc',
        sortBy: 'nameEn',
        sortOrder: 'ASC',
    },
    {
        value: 'nameEn-DESC',
        labelKey: 'category.sort.nameEnDesc',
        sortBy: 'nameEn',
        sortOrder: 'DESC',
    },
    {
        value: 'nameKm-ASC',
        labelKey: 'category.sort.nameKmAsc',
        sortBy: 'nameKm',
        sortOrder: 'ASC',
    },
    {
        value: 'updatedAt-DESC',
        labelKey: 'category.sort.recentlyUpdated',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
    },
];

export const DEFAULT_CATEGORY_SORT = CATEGORY_SORT_OPTIONS[0];