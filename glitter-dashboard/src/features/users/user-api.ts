import { apiClient } from '@/lib/api-client';
import type {
    User,
    UserFormValues,
    UserListResponse,
    UserQuery,
} from '@/types/user';

interface ApiEnvelope<T> {
    data: T;
}

export interface UserSummary {
    id: string;
    fullName: string;
    email: string | null;
    phoneNumber: string | null;
    role: string;
}

export const userApi = {
    async list(query: UserQuery = {}): Promise<UserListResponse> {
        const { data } = await apiClient.get<UserListResponse>('/api/users', {
            params: {
                page: query.page ?? 1,
                limit: query.limit ?? 10,
                ...(query.search ? { search: query.search } : {}),
                ...(query.role ? { role: query.role } : {}),
                ...(query.accountStatus
                    ? { accountStatus: query.accountStatus }
                    : {}),
                ...(query.branchId ? { branchId: query.branchId } : {}),
                ...(query.staffOnly ? { staffOnly: true } : {}),
            },
        });
        return data;
    },

    async getById(id: string): Promise<User> {
        const { data } = await apiClient.get<ApiEnvelope<User>>(
            `/api/users/${id}`,
        );
        return data.data;
    },

    async create(payload: UserFormValues): Promise<User> {
        const { data } = await apiClient.post<ApiEnvelope<User>>(
            '/api/users',
            payload,
        );
        return data.data;
    },

    async update(id: string, payload: UserFormValues): Promise<User> {
        const { data } = await apiClient.patch<ApiEnvelope<User>>(
            `/api/users/${id}`,
            payload,
        );
        return data.data;
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/api/users/${id}`);
    },

    /** Admin: set or reset a user's login password. */
    async setPassword(id: string, password: string): Promise<void> {
        await apiClient.patch(`/api/users/${id}/password`, { password });
    },

    async uploadAvatar(id: string, file: File): Promise<User> {
        const fd = new FormData();
        fd.append('avatar', file);
        const { data } = await apiClient.patch<ApiEnvelope<User>>(
            `/api/users/${id}/avatar`,
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return data.data;
    },

    async removeAvatar(id: string): Promise<User> {
        const { data } = await apiClient.delete<ApiEnvelope<User>>(
            `/api/users/${id}/avatar`,
        );
        return data.data;
    },

    /** Lightweight customer list for pickers (e.g. order creation). */
    async listCustomers(search?: string, limit = 50): Promise<UserSummary[]> {
        const { data } = await apiClient.get<UserListResponse>('/api/users', {
            params: {
                role: 'customer',
                limit,
                ...(search ? { search } : {}),
            },
        });
        return data.data as unknown as UserSummary[];
    },
};
