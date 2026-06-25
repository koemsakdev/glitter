import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    Banner,
    BannerFormValues,
    BannerListResponse,
} from '@/types/banner';

const BANNERS_KEY = ['banners'] as const;

export function useBanners() {
    return useQuery({
        queryKey: BANNERS_KEY,
        queryFn: async () => {
            const { data } =
                await apiClient.get<BannerListResponse>('/api/banners');
            return data.data;
        },
    });
}

export function useCreateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values: BannerFormValues) => {
            const { data } = await apiClient.post<{ data: Banner }>(
                '/api/banners',
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BANNERS_KEY });
        },
    });
}

export function useUpdateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: Partial<BannerFormValues>;
        }) => {
            const { data } = await apiClient.patch<{ data: Banner }>(
                `/api/banners/${id}`,
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BANNERS_KEY });
        },
    });
}

export function useDeleteBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/banners/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BANNERS_KEY });
        },
    });
}
