import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Badge, BadgeFormValues } from '@/types/badge';

const BADGES_KEY = ['badges'] as const;

export function useBadges() {
    return useQuery({
        queryKey: BADGES_KEY,
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: Badge[] }>(
                '/api/badges',
            );
            return data.data;
        },
    });
}

export function useCreateBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values: BadgeFormValues) => {
            const { data } = await apiClient.post<{ data: Badge }>(
                '/api/badges',
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BADGES_KEY });
        },
    });
}

export function useUpdateBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: Partial<BadgeFormValues>;
        }) => {
            const { data } = await apiClient.patch<{ data: Badge }>(
                `/api/badges/${id}`,
                values,
            );
            return data.data;
        },
        // Optimistic: apply the change to the cache immediately so the UI
        // (e.g. the enable/disable switch) responds instantly, then reconcile.
        onMutate: async ({ id, values }) => {
            await queryClient.cancelQueries({ queryKey: BADGES_KEY });
            const previous = queryClient.getQueryData<Badge[]>(BADGES_KEY);
            queryClient.setQueryData<Badge[]>(BADGES_KEY, (old) =>
                old?.map((b) => (b.id === id ? { ...b, ...values } : b)),
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(BADGES_KEY, context.previous);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: BADGES_KEY });
        },
    });
}

export function useDeleteBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/badges/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BADGES_KEY });
        },
    });
}
