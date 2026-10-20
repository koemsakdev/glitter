import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ReportSummary {
    revenue: number;
    /** Orders that count as sales. */
    orders: number;
    itemsSold: number;
    avgOrderValue: number;
    discounts: number;
    shipping: number;
    /** Every order in the range, whatever its status. */
    allOrders: number;
    cancelled: number;
    customers: number;
}

export interface SalesReport {
    range: { from: string; to: string; granularity: 'day' | 'month' };
    summary: ReportSummary;
    /** Same-length period right before `range`. */
    previous: ReportSummary;
    newCustomers: number;
    byStatus: { status: string; orders: number; amount: number }[];
    byDay: { day: string; orders: number; revenue: number }[];
    byPaymentMethod: { method: string; count: number; amount: number }[];
    byDelivery: { method: string; orders: number; revenue: number }[];
    byHour: { hour: number; orders: number; revenue: number }[];
    byBranch: {
        branchId: string;
        name: string;
        orders: number;
        revenue: number;
    }[];
    topProducts: {
        productId: string;
        name: string;
        imageUrl: string | null;
        quantity: number;
        revenue: number;
    }[];
    topCustomers: {
        key: string;
        name: string;
        phone: string | null;
        orders: number;
        revenue: number;
    }[];
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
                        ...(params.branchId
                            ? { branchId: params.branchId }
                            : {}),
                    },
                },
            );
            return data.data;
        },
        placeholderData: keepPreviousData,
    });
}

export interface OrderExportRow {
    orderNumber: string;
    date: string;
    time: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    source: string;
    branch: string;
    cashier: string;
    customer: string;
    phone: string;
    items: number;
    products: string;
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
    countsAsSale: boolean;
}

/** Every order in the range (all statuses) — used for the CSV export. */
export async function fetchOrderExport(params: {
    from: string;
    to: string;
    branchId?: string | null;
}) {
    const { data } = await apiClient.get<{
        data: { range: { from: string; to: string }; rows: OrderExportRow[] };
    }>('/api/reports/orders', {
        params: {
            from: params.from,
            to: params.to,
            ...(params.branchId ? { branchId: params.branchId } : {}),
        },
    });
    return data.data;
}
