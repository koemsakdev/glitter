import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '@/features/categories/category-api';

const CATEGORY_OPTIONS_KEY = ['categories', 'options'] as const;

/**
 * Fetches all categories for use in dropdowns.
 */
export function useCategoryOptions() {
    return useQuery({
        queryKey: CATEGORY_OPTIONS_KEY,
        queryFn: () =>
            categoryApi.list({
                page: 1,
                limit: 100,
                sortBy: 'nameEn',
                sortOrder: 'ASC',
            }),
        staleTime: 5 * 60 * 1000,
        select: (data) => data.data,
    });
}