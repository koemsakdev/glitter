import { apiClient } from '@/lib/api-client';
import type {
    MenuDetailResponse,
    MenuFormValues,
    MenuItem,
    MenuListResponse,
    MenuLocation,
    ReorderMenuItem,
} from '@/types/menu';

export const menuApi = {
    async list(location?: MenuLocation): Promise<MenuItem[]> {
        const { data } = await apiClient.get<MenuListResponse>('/api/menu', {
            params: location ? { location } : {},
        });
        return data.data;
    },

    async create(values: MenuFormValues): Promise<MenuItem> {
        const { data } = await apiClient.post<MenuDetailResponse>(
            '/api/menu',
            values,
        );
        return data.data;
    },

    async update(
        id: string,
        values: Partial<MenuFormValues>,
    ): Promise<MenuItem> {
        const { data } = await apiClient.patch<MenuDetailResponse>(
            `/api/menu/${id}`,
            values,
        );
        return data.data;
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/api/menu/${id}`);
    },

    async reorder(items: ReorderMenuItem[]): Promise<MenuItem[]> {
        const { data } = await apiClient.patch<MenuListResponse>(
            '/api/menu/reorder',
            { items },
        );
        return data.data;
    },
};
