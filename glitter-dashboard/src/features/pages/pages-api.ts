import { apiClient } from '@/lib/api-client';
import type {
    Page,
    PageDetailResponse,
    PageFormValues,
    PageListResponse,
} from '@/types/page';

export const pagesApi = {
    async list(): Promise<Page[]> {
        const { data } = await apiClient.get<PageListResponse>('/api/pages');
        return data.data;
    },

    async create(values: PageFormValues): Promise<Page> {
        const { data } = await apiClient.post<PageDetailResponse>(
            '/api/pages',
            values,
        );
        return data.data;
    },

    async update(
        id: string,
        values: Partial<PageFormValues>,
    ): Promise<Page> {
        const { data } = await apiClient.patch<PageDetailResponse>(
            `/api/pages/${id}`,
            values,
        );
        return data.data;
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/api/pages/${id}`);
    },
};
