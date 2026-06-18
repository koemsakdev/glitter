import { apiClient } from '@/lib/api-client';
import type { User } from '@/types/api';

interface ApiEnvelope<T> {
    data: T;
}

export interface ProfileUpdateValues {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
}

export const profileApi = {
    async update(id: string, payload: ProfileUpdateValues): Promise<User> {
        const { data } = await apiClient.patch<ApiEnvelope<User>>(
            `/api/users/${id}`,
            payload,
        );
        return data.data;
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
};
