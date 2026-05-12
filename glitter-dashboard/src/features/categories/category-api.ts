import { apiClient } from '@/lib/api-client';
import type {
    Category,
    CategoryFormValues,
    CategoryListResponse,
    CategoryQuery,
} from '@/types/category';

interface ApiEnvelope<T> {
    data: T;
}

function toFormData(values: CategoryFormValues): FormData {
    const fd = new FormData();
    fd.append('slug', values.slug);
    fd.append('nameEn', values.nameEn);
    fd.append('nameKm', values.nameKm);
    if (values.descriptionEn) fd.append('descriptionEn', values.descriptionEn);
    if (values.descriptionKm) fd.append('descriptionKm', values.descriptionKm);
    if (values.displayOrder !== undefined) {
        fd.append('displayOrder', String(values.displayOrder));
    }
    fd.append('categoryType', values.categoryType);
    if (values.icon) {
        fd.append('icon', values.icon);
    } else if (values.clearIcon) {
        fd.append('clearIcon', 'true');
    }
    return fd;
}

export const categoryApi = {
    async list(query: CategoryQuery = {}): Promise<CategoryListResponse> {
        const { data } = await apiClient.get<CategoryListResponse>(
            '/api/categories',
            {
                params: {
                    page: query.page ?? 1,
                    limit: query.limit ?? 10,
                    ...(query.search ? { search: query.search } : {}),
                    ...(query.categoryType
                        ? { categoryType: query.categoryType }
                        : {}),
                    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
                    ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
                },
            },
        );
        return data;
    },

    async getById(id: string): Promise<Category> {
        const { data } = await apiClient.get<ApiEnvelope<Category>>(
            `/api/categories/${id}`,
        );
        return data.data;
    },

    async create(values: CategoryFormValues): Promise<Category> {
        const { data } = await apiClient.post<ApiEnvelope<Category>>(
            '/api/categories',
            toFormData(values),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return data.data;
    },

    async update(
        id: string,
        values: CategoryFormValues,
    ): Promise<Category> {
        const { data } = await apiClient.patch<ApiEnvelope<Category>>(
            `/api/categories/${id}`,
            toFormData(values),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return data.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/categories/${id}`);
    },
};