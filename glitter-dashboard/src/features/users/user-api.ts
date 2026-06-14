import { apiClient } from '@/lib/api-client';

export interface UserSummary {
    id: string;
    fullName: string;
    email: string | null;
    phoneNumber: string | null;
    role: string;
}

interface UserListResponse {
    data: UserSummary[];
    total: number;
    page: number;
    limit: number;
}

export const userApi = {
    /** List customers (role = customer), optionally filtered by a search term. */
    async listCustomers(search?: string, limit = 50): Promise<UserSummary[]> {
        const { data } = await apiClient.get<UserListResponse>('/api/users', {
            params: {
                role: 'customer',
                limit,
                ...(search ? { search } : {}),
            },
        });
        return data.data;
    },
};
