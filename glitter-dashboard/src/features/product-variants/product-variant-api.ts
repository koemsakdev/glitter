import { apiClient } from '@/lib/api-client';
import type {
    BulkCreateVariantsPayload,
    CreateVariantPayload,
    ProductVariant,
    UpdateVariantPayload,
} from '@/types/product';

interface ApiEnvelope<T> {
    data: T;
}

interface BulkResponse {
    data: ProductVariant[];
    count: number;
}

export const productVariantApi = {
    /**
     * Get all variants for a product, ordered by createdAt ASC.
     */
    async listByProduct(productId: string): Promise<ProductVariant[]> {
        const { data } = await apiClient.get<ApiEnvelope<ProductVariant[]>>(
            `/api/product-variants/product/${productId}`,
        );
        return data.data;
    },

    /**
     * Create a single variant.
     * If product currently has only the auto-default variant, it'll be replaced.
     */
    async create(payload: CreateVariantPayload): Promise<ProductVariant> {
        const { data } = await apiClient.post<ApiEnvelope<ProductVariant>>(
            '/api/product-variants',
            payload,
        );
        return data.data;
    },

    /**
     * Create multiple variants at once.
     * Used in product CREATE flow after the product itself is saved.
     */
    async createBulk(payload: BulkCreateVariantsPayload): Promise<ProductVariant[]> {
        const { data } = await apiClient.post<BulkResponse>(
            '/api/product-variants/bulk',
            payload,
        );
        return data.data;
    },

    /**
     * Update variant metadata (SKU, size, color, stock, price override).
     */
    async update(
        id: string,
        payload: UpdateVariantPayload,
    ): Promise<ProductVariant> {
        const { data } = await apiClient.patch<ApiEnvelope<ProductVariant>>(
            `/api/product-variants/${id}`,
            payload,
        );
        return data.data;
    },

    /**
     * Adjust stock by delta (positive adds, negative subtracts).
     */
    async adjustStock(id: string, delta: number): Promise<ProductVariant> {
        const { data } = await apiClient.patch<ApiEnvelope<ProductVariant>>(
            `/api/product-variants/${id}/adjust-stock`,
            undefined,
            { params: { delta } },
        );
        return data.data;
    },

    /**
     * Delete a variant. Backend prevents deletion if it's the only one.
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/product-variants/${id}`);
    },
};