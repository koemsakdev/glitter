import { apiClient } from '@/lib/api-client';
import type {
    CreateOrderPayload,
    Order,
    OrderListResponse,
    OrderQuery,
    OrderStats,
    OrderPaymentStatus,
    OrderStatus,
} from '@/types/order';

interface ApiEnvelope<T> {
    data: T;
}

export const orderApi = {
    async list(query: OrderQuery = {}): Promise<OrderListResponse> {
        const { data } = await apiClient.get<OrderListResponse>('/api/orders', {
            params: {
                page: query.page ?? 1,
                limit: query.limit ?? 10,
                ...(query.source ? { source: query.source } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.branchId ? { branchId: query.branchId } : {}),
                ...(query.search ? { search: query.search } : {}),
            },
        });
        return data;
    },

    async getStats(branchId?: string): Promise<OrderStats> {
        const { data } = await apiClient.get<OrderStats>('/api/orders/stats', {
            params: branchId ? { branchId } : {},
        });
        return data;
    },

    async getById(id: string): Promise<Order> {
        const { data } = await apiClient.get<ApiEnvelope<Order>>(
            `/api/orders/${id}`,
        );
        return data.data;
    },

    async create(payload: CreateOrderPayload): Promise<Order> {
        const { data } = await apiClient.post<ApiEnvelope<Order>>(
            '/api/orders',
            payload,
        );
        return data.data;
    },

    async updateStatus(id: string, status: OrderStatus): Promise<Order> {
        const { data } = await apiClient.patch<ApiEnvelope<Order>>(
            `/api/orders/${id}/status`,
            { status },
        );
        return data.data;
    },

    async updatePaymentStatus(
        id: string,
        paymentStatus: OrderPaymentStatus,
    ): Promise<Order> {
        const { data } = await apiClient.patch<ApiEnvelope<Order>>(
            `/api/orders/${id}/payment-status`,
            { paymentStatus },
        );
        return data.data;
    },
};
