import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    Advertisement,
    AdvertisementFormValues,
    AdvertisementListResponse,
} from '@/types/advertisement';

const ADS_KEY = ['advertisements'] as const;

export function useAdvertisements() {
    return useQuery({
        queryKey: ADS_KEY,
        queryFn: async () => {
            const { data } =
                await apiClient.get<AdvertisementListResponse>(
                    '/api/advertisements',
                );
            return data.data;
        },
    });
}

export function useCreateAdvertisement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values: AdvertisementFormValues) => {
            const { data } = await apiClient.post<{ data: Advertisement }>(
                '/api/advertisements',
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADS_KEY });
        },
    });
}

export function useUpdateAdvertisement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: AdvertisementFormValues;
        }) => {
            const { data } = await apiClient.patch<{ data: Advertisement }>(
                `/api/advertisements/${id}`,
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADS_KEY });
        },
    });
}

export function useDeleteAdvertisement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            apiClient.delete(`/api/advertisements/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADS_KEY });
        },
    });
}
