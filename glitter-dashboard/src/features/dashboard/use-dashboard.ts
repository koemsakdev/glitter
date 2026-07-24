import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboard-api';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboardStats(
    range?: { from?: string; to?: string },
    enabled = true,
) {
    return useQuery({
        queryKey: [...DASHBOARD_KEY, 'stats', range?.from ?? '', range?.to ?? ''],
        queryFn: () => dashboardApi.getStats(range),
        // The stats endpoint is manager+ only — cashiers must not call it.
        enabled,
        // Server memoizes the payload for ~20s, so revisits render instantly
        // from the query cache and background polling stays cheap.
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });
}