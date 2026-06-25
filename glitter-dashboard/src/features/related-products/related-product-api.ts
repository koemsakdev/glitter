import { apiClient } from '@/lib/api-client';
import type { Product } from '@/types/product';

export const relatedProductApi = {
    async get(productId: string): Promise<Product[]> {
        const { data } = await apiClient.get<{ data: Product[] }>(
            `/api/related-products/product/${productId}`,
        );
        return data.data;
    },
    async set(productId: string, relatedProductIds: string[]): Promise<void> {
        await apiClient.put(`/api/related-products/product/${productId}`, {
            relatedProductIds,
        });
    },
};
