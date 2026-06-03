import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productBadgeApi } from './product-badge-api';
import type { CreateBadgePayload } from '@/types/product-badge';

const BADGES_KEY = ['product-badges'] as const;

export function useProductBadges(productId: string | undefined) {
    return useQuery({
        queryKey: [...BADGES_KEY, productId],
        queryFn: () => productBadgeApi.listByProduct(productId!),
        enabled: Boolean(productId),
    });
}

export function useCreateProductBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateBadgePayload) =>
            productBadgeApi.create(payload),
        onSuccess: (_data, payload) => {
            void queryClient.invalidateQueries({
                queryKey: [...BADGES_KEY, payload.productId],
            });
        },
    });
}

export function useDeleteProductBadge() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { id: string; productId: string }) =>
            productBadgeApi.delete(id),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...BADGES_KEY, productId],
            });
        },
    });
}