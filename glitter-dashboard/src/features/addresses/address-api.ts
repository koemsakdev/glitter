import { apiClient } from '@/lib/api-client';
import type {
    Address,
    AddressFormValues,
    AddressListResponse,
} from '@/types/address';

interface ApiEnvelope<T> {
    data: T;
}

export const addressApi = {
    async listByUser(userId: string): Promise<Address[]> {
        const { data } = await apiClient.get<AddressListResponse>(
            '/api/addresses',
            { params: { userId } },
        );
        return data.data;
    },

    async create(payload: AddressFormValues): Promise<Address> {
        const { data } = await apiClient.post<ApiEnvelope<Address>>(
            '/api/addresses',
            payload,
        );
        return data.data;
    },

    async update(
        id: string,
        payload: Omit<AddressFormValues, 'userId'>,
    ): Promise<Address> {
        // userId is not updatable — strip it so the backend (forbidNonWhitelisted)
        // doesn't reject the request.
        const { userId: _omit, ...body } = payload as AddressFormValues;
        void _omit;
        const { data } = await apiClient.patch<ApiEnvelope<Address>>(
            `/api/addresses/${id}`,
            body,
        );
        return data.data;
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete(`/api/addresses/${id}`);
    },

    async setDefaultShipping(id: string): Promise<Address> {
        const { data } = await apiClient.patch<ApiEnvelope<Address>>(
            `/api/addresses/${id}/set-default-shipping`,
        );
        return data.data;
    },

    async setDefaultBilling(id: string): Promise<Address> {
        const { data } = await apiClient.patch<ApiEnvelope<Address>>(
            `/api/addresses/${id}/set-default-billing`,
        );
        return data.data;
    },
};
