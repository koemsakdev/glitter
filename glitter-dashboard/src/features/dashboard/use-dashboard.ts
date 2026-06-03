import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboard-api';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboardStats() {
    return useQuery({
        queryKey: [...DASHBOARD_KEY, 'stats'],
        queryFn: () => dashboardApi.getStats(),
        refetchInterval: 30 * 1000,
        staleTime: 10 * 1000,
    });
}