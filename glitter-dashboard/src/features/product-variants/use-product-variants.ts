import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { productVariantApi } from './product-variant-api';
import type {
    BulkCreateVariantsPayload,
    CreateVariantPayload,
    UpdateVariantPayload,
} from '@/types/product';

const VARIANTS_KEY = ['product-variants'] as const;

export function useProductVariants(productId: string | undefined) {
    return useQuery({
        queryKey: [...VARIANTS_KEY, productId],
        queryFn: () => productVariantApi.listByProduct(productId!),
        enabled: Boolean(productId),
    });
}

export function useCreateProductVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateVariantPayload) =>
            productVariantApi.create(payload),
        onSuccess: (_data, payload) => {
            void queryClient.invalidateQueries({
                queryKey: [...VARIANTS_KEY, payload.productId],
            });
        },
    });
}

export function useBulkCreateProductVariants() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: BulkCreateVariantsPayload) =>
            productVariantApi.createBulk(payload),
        onSuccess: (_data, payload) => {
            void queryClient.invalidateQueries({
                queryKey: [...VARIANTS_KEY, payload.productId],
            });
        },
    });
}

export function useUpdateProductVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         id,
                         productId: _productId,
                         payload,
                     }: {
            id: string;
            productId: string;
            payload: UpdateVariantPayload;
        }) => productVariantApi.update(id, payload),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...VARIANTS_KEY, productId],
            });
        },
    });
}

export function useDeleteProductVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { id: string; productId: string }) =>
            productVariantApi.delete(id),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...VARIANTS_KEY, productId],
            });
        },
    });
}