import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/types/dashboard';

interface ApiEnvelope<T> {
    data: T;
}

export const dashboardApi = {
    async getStats(range?: {
        from?: string;
        to?: string;
    }): Promise<DashboardStats> {
        const { data } = await apiClient.get<ApiEnvelope<DashboardStats>>(
            '/api/dashboard/stats',
            { params: { from: range?.from, to: range?.to } },
        );
        return data.data;
    },
};