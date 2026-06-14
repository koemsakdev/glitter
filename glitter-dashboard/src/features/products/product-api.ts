import { apiClient } from '@/lib/api-client';
import type {
    Product,
    ProductFormValues,
    ProductListResponse,
    ProductQuery,
} from '@/types/product';

interface ApiEnvelope<T> {
    data: T;
}

export const productApi = {
    async list(query: ProductQuery = {}): Promise<ProductListResponse> {
        const { data } = await apiClient.get<ProductListResponse>(
            '/api/products',
            {
                params: {
                    page: query.page ?? 1,
                    limit: query.limit ?? 10,
                    ...(query.search ? { search: query.search } : {}),
                    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
                    ...(query.brandId ? { brandId: query.brandId } : {}),
                    ...(query.status ? { status: query.status } : {}),
                    ...(query.productType ? { productType: query.productType } : {}),
                    ...(query.minPrice !== undefined
                        ? { minPrice: query.minPrice }
                        : {}),
                    ...(query.maxPrice !== undefined
                        ? { maxPrice: query.maxPrice }
                        : {}),
                    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
                    ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
                    ...(query.branchId ? { branchId: query.branchId } : {})
                },
            },
        );
        return data;
    },

    async getById(id: string): Promise<Product> {
        const { data } = await apiClient.get<ApiEnvelope<Product>>(
            `/api/products/${id}`,
        );
        return data.data;
    },

    async create(values: ProductFormValues): Promise<Product> {
        const { data } = await apiClient.post<ApiEnvelope<Product>>(
            '/api/products',
            values,
        );
        return data.data;
    },

    async update(id: string, values: ProductFormValues): Promise<Product> {
        const { data } = await apiClient.patch<ApiEnvelope<Product>>(
            `/api/products/${id}`,
            values,
        );
        return data.data;
    },

    async archive(id: string): Promise<Product> {
        const { data } = await apiClient.patch<ApiEnvelope<Product>>(
            `/api/products/${id}/archive`,
        );
        return data.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/products/${id}`);
    },
};