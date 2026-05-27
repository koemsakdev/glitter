import { apiClient } from '@/lib/api-client';
import type { ImageType, ProductImage } from '@/types/product';

interface ApiEnvelope<T> {
    data: T;
}

interface BulkUploadResponse {
    data: ProductImage[];
    count: number;
}

export const productImageApi = {
    /**
     * Get all images for a product, ordered by displayOrder ASC.
     */
    async listByProduct(productId: string): Promise<ProductImage[]> {
        const { data } = await apiClient.get<ApiEnvelope<ProductImage[]>>(
            `/api/product-images/product/${productId}`,
        );
        return data.data;
    },

    /**
     * Upload multiple images for a product in a single request.
     * All uploaded images share the same imageType (default: 'gallery').
     */
    async bulkUpload(
        productId: string,
        files: File[],
        imageType: ImageType = 'gallery',
    ): Promise<ProductImage[]> {
        const formData = new FormData();
        formData.append('productId', productId);
        formData.append('imageType', imageType);
        files.forEach((file) => {
            formData.append('images', file);
        });

        const { data } = await apiClient.post<BulkUploadResponse>(
            '/api/product-images/bulk',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            },
        );
        return data.data;
    },

    /**
     * Update image metadata (alt text, type, display order).
     * To set/unset primary, use this endpoint with imageType: 'primary' | 'gallery'.
     */
    async update(
        id: string,
        updates: {
            imageAltTextEn?: string;
            imageAltTextKm?: string;
            imageType?: ImageType;
            displayOrder?: number;
        },
    ): Promise<ProductImage> {
        const formData = new FormData();
        if (updates.imageAltTextEn !== undefined) {
            formData.append('imageAltTextEn', updates.imageAltTextEn);
        }
        if (updates.imageAltTextKm !== undefined) {
            formData.append('imageAltTextKm', updates.imageAltTextKm);
        }
        if (updates.imageType !== undefined) {
            formData.append('imageType', updates.imageType);
        }
        if (updates.displayOrder !== undefined) {
            formData.append('displayOrder', String(updates.displayOrder));
        }

        const { data } = await apiClient.patch<ApiEnvelope<ProductImage>>(
            `/api/product-images/${id}`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            },
        );
        return data.data;
    },

    /**
     * Mark this image as primary — backend automatically demotes any existing primary to gallery.
     */
    async setPrimary(id: string): Promise<ProductImage> {
        return this.update(id, { imageType: 'primary' });
    },

    /**
     * Reorder images for a product. Pass the imageIds in their new order;
     * the backend assigns displayOrder 0, 1, 2, ... based on array position.
     */
    async reorder(
        productId: string,
        imageIds: string[],
    ): Promise<ProductImage[]> {
        const items = imageIds.map((id, index) => ({
            id,
            displayOrder: index,
        }));

        const { data } = await apiClient.put<ApiEnvelope<ProductImage[]>>(
            `/api/product-images/product/${productId}/reorder`,
            { items },
        );
        return data.data;
    },

    /**
     * Delete a single image (removes from DB and disk).
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/product-images/${id}`);
    },
};