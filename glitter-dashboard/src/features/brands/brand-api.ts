import { apiClient } from '@/lib/api-client';
import type {
    Brand,
    BrandFormValues,
    BrandListResponse,
    BrandQuery,
} from '@/types/brand';

function toFormData(values: BrandFormValues): FormData {
    const fd = new FormData();
    fd.append('name', values.name);
    fd.append('slug', values.slug);
    if (values.websiteUrl) fd.append('websiteUrl', values.websiteUrl);
    if (values.description) fd.append('description', values.description);
    fd.append('status', values.status);
    if (values.logo) {
        fd.append('logo', values.logo);
    } else if (values.clearLogo) {
        fd.append('clearLogo', 'true');
    }
    return fd;
}

export const brandApi = {
    async list(query: BrandQuery = {}): Promise<BrandListResponse> {
        const { data } = await apiClient.get<BrandListResponse>('/api/brands', {
            params: {
                page: query.page ?? 1,
                limit: query.limit ?? 10,
                ...(query.search ? { search: query.search } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.sortBy ? { sortBy: query.sortBy } : {}),
                ...(query.sortOrder ? { sortOrder: query.sortOrder } : {}),
            },
        });
        return data;
    },

    async getById(id: string): Promise<Brand> {
        const { data } = await apiClient.get<Brand>(`/api/brands/${id}`);
        return data;
    },

    async create(values: BrandFormValues): Promise<Brand> {
        const { data } = await apiClient.post<Brand>(
            '/api/brands',
            toFormData(values),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return data;
    },

    async update(id: string, values: BrandFormValues): Promise<Brand> {
        const { data } = await apiClient.patch<Brand>(
            `/api/brands/${id}`,
            toFormData(values),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/brands/${id}`);
    },
};
