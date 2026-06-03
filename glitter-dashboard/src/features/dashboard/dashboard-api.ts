import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/types/dashboard';

interface ApiEnvelope<T> {
    data: T;
}

export const dashboardApi = {
    async getStats(): Promise<DashboardStats> {
        const { data } = await apiClient.get<ApiEnvelope<DashboardStats>>(
            '/api/dashboard/stats',
        );
        return data.data;
    },
};