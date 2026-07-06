import { apiClient } from '@/lib/api-client';
import type {
    CreateBadgePayload,
    ProductBadge,
} from '@/types/product-badge';

interface ApiEnvelope<T> {
    data: T;
}
interface ListEnvelope<T> {
    data: T[];
    total: number;
}

export const productBadgeApi = {
    async listByProduct(productId: string): Promise<ProductBadge[]> {
        const { data } = await apiClient.get<ListEnvelope<ProductBadge>>(
            `/api/product-badges/product/${productId}`,
        );
        return data.data;
    },

    async create(payload: CreateBadgePayload): Promise<ProductBadge> {
        const { data } = await apiClient.post<ApiEnvelope<ProductBadge>>(
            '/api/product-badges',
            payload,
        );
        return data.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/product-badges/${id}`);
    },

    /** Replace the product's whole badge set atomically. */
    async set(productId: string, badgeTypes: string[]): Promise<ProductBadge[]> {
        const { data } = await apiClient.put<ListEnvelope<ProductBadge>>(
            `/api/product-badges/product/${productId}`,
            { badgeTypes },
        );
        return data.data;
    },
};