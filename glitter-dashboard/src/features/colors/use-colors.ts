import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Color, ColorFormValues } from '@/types/color';

const COLORS_KEY = ['colors'] as const;

export function useColors() {
    return useQuery({
        queryKey: COLORS_KEY,
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: Color[] }>(
                '/api/colors',
            );
            return data.data;
        },
    });
}

export function useCreateColor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values: ColorFormValues) => {
            const { data } = await apiClient.post<{ data: Color }>(
                '/api/colors',
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COLORS_KEY });
        },
    });
}

export function useUpdateColor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: Partial<ColorFormValues>;
        }) => {
            const { data } = await apiClient.patch<{ data: Color }>(
                `/api/colors/${id}`,
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COLORS_KEY });
        },
    });
}

export function useDeleteColor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/colors/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: COLORS_KEY });
        },
    });
}
