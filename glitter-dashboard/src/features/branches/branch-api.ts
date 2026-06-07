import { apiClient } from '@/lib/api-client';
import type {
    Branch,
    BranchFormValues,
    BranchListParams,
} from '@/types/branch';

interface ApiEnvelope<T> {
    data: T;
}

interface ListEnvelope<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export const branchApi = {
    async list(params?: BranchListParams): Promise<ListEnvelope<Branch>> {
        const { data } = await apiClient.get<ListEnvelope<Branch>>('/api/branches', {
            params,
        });
        return data;
    },

    async listActive(): Promise<Branch[]> {
        const { data } = await apiClient.get<ListEnvelope<Branch>>(
            '/api/branches/status/active',
        );
        return data.data;
    },

    async getById(id: string): Promise<Branch> {
        const { data } = await apiClient.get<ApiEnvelope<Branch>>(
            `/api/branches/${id}`,
        );
        return data.data;
    },

    async getByCode(branchCode: string): Promise<Branch> {
        const { data } = await apiClient.get<ApiEnvelope<Branch>>(
            `/api/branches/code/${branchCode}`,
        );
        return data.data;
    },

    async create(payload: BranchFormValues): Promise<Branch> {
        const { data } = await apiClient.post<ApiEnvelope<Branch>>(
            '/api/branches',
            payload,
        );
        return data.data;
    },

    async update(
        id: string,
        payload: Partial<BranchFormValues>,
    ): Promise<Branch> {
        const { data } = await apiClient.patch<ApiEnvelope<Branch>>(
            `/api/branches/${id}`,
            payload,
        );
        return data.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/api/branches/${id}`);
    },
};