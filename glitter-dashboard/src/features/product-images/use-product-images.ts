import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { productImageApi } from './product-image-api';
import type { ImageType } from '@/types/product';

const PRODUCT_IMAGES_KEY = ['product-images'] as const;

export function useProductImages(productId: string | undefined) {
    return useQuery({
        queryKey: [...PRODUCT_IMAGES_KEY, productId],
        queryFn: () => productImageApi.listByProduct(productId!),
        enabled: Boolean(productId),
    });
}

export function useBulkUploadProductImages() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         productId,
                         files,
                         imageType,
                     }: {
            productId: string;
            files: File[];
            imageType?: ImageType;
        }) => productImageApi.bulkUpload(productId, files, imageType),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...PRODUCT_IMAGES_KEY, productId],
            });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useSetPrimaryProductImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { id: string; productId: string }) =>
            productImageApi.setPrimary(id),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...PRODUCT_IMAGES_KEY, productId],
            });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useReorderProductImages() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         productId,
                         imageIds,
                     }: {
            productId: string;
            imageIds: string[];
        }) => productImageApi.reorder(productId, imageIds),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...PRODUCT_IMAGES_KEY, productId],
            });
        },
    });
}

export function useDeleteProductImage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { id: string; productId: string }) =>
            productImageApi.delete(id),
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({
                queryKey: [...PRODUCT_IMAGES_KEY, productId],
            });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}