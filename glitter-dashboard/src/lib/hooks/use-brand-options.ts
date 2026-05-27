import { useQuery } from '@tanstack/react-query';
import { brandApi } from '@/features/brands/brand-api';

const BRAND_OPTIONS_KEY = ['brands', 'options'] as const;

/**
 * Fetches all active brands for use in dropdowns (Combobox, Select).
 * Fetches with a large page size to get all in one call.
 * Cached for 5 minutes to avoid re-fetching on every form open.
 */
export function useBrandOptions() {
    return useQuery({
        queryKey: BRAND_OPTIONS_KEY,
        queryFn: () =>
            brandApi.list({
                page: 1,
                limit: 100, // assume <= 100 brands in the catalog
                status: 'active',
                sortBy: 'name',
                sortOrder: 'ASC',
            }),
        staleTime: 5 * 60 * 1000, // 5 minutes
        select: (data) => data.data, // unwrap to just the array
    });
}