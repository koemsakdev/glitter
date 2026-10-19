import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SalesReport {
    range: { from: string; to: string };
    summary: {
        revenue: number;
        orders: number;
        itemsSold: number;
        avgOrderValue: number;
        discounts: number;
    };
    byDay: { day: string; orders: number; revenue: number }[];
    byPaymentMethod: { method: string; count: number; amount: number }[];
    bySource: { source: string; orders: number; revenue: number }[];
    byCashier: {
        cashierId: string;
        name: string;
        username: string | null;
        orders: number;
        revenue: number;
    }[];
    byBranch: { branchId: string; name: string; orders: number; revenue: number }[];
    topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
}

export function useSalesReport(params: {
    from: string;
    to: string;
    branchId?: string | null;
}) {
    return useQuery({
        queryKey: ['reports', 'sales', params],
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: SalesReport }>(
                '/api/reports/sales',
                {
                    params: {
                        from: params.from,
                        to: params.to,
                        ...(params.branchId ? { branchId: params.branchId } : {}),
                    },
                },
            );
            return data.data;
        },
        placeholderData: keepPreviousData,
    });
}
