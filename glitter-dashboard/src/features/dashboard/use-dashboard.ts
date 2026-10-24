import { useSelectedBranchId } from '@/stores/use-branch-context';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboard-api';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboardStats(
    range?: { from?: string; to?: string },
    enabled = true,
) {
    // Admin's header branch filter, or the manager's own branch.
    const branchId = useSelectedBranchId();
    return useQuery({
        queryKey: [
            ...DASHBOARD_KEY,
            'stats',
            range?.from ?? '',
            range?.to ?? '',
            branchId ?? 'all',
        ],
        queryFn: () => dashboardApi.getStats(range, branchId),
        // The stats endpoint is manager+ only — cashiers must not call it.
        enabled,
        // Server memoizes the payload for ~20s, so revisits render instantly
        // from the query cache and background polling stays cheap.
        staleTime: 30 * 1000,
        // Heavy query — keep it around so returning to the Dashboard is instant.
        gcTime: 30 * 60 * 1000,
        refetchInterval: 60 * 1000,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });
}