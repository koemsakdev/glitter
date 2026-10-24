import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productApi } from './product-api';
import type { ProductFormValues, ProductQuery } from '@/types/product';
import { removeFromCache } from '@/lib/remove-from-cache';

const PRODUCTS_KEY = ['products'] as const;

export function useProducts(
    query: ProductQuery,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...PRODUCTS_KEY, query],
        queryFn: () => productApi.list(query),
        enabled: options?.enabled ?? true,
        // Keep showing the previous results while the next search loads.
        placeholderData: (prev) => prev,
    });
}

export function useProduct(id: string | undefined) {
    return useQuery({
        queryKey: [...PRODUCTS_KEY, 'detail', id],
        queryFn: () => productApi.getById(id!),
        enabled: Boolean(id),
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: ProductFormValues) => productApi.create(values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            values,
        }: {
            id: string;
            values: ProductFormValues;
        }) => productApi.update(id, values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        },
    });
}

export function useArchiveProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => productApi.archive(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => productApi.delete(id),
        onSuccess: (_data, id) => {
            removeFromCache(queryClient, PRODUCTS_KEY, id);
            // Refresh lists etc., but NOT the deleted product's own detail
            // query: the detail page is still mounted until the redirect
            // finishes, and refetching it would 404 and flash "Could not
            // load product". Its cached copy simply expires later.
            void queryClient.invalidateQueries({
                queryKey: PRODUCTS_KEY,
                predicate: (q) =>
                    !(q.queryKey[1] === 'detail' && q.queryKey[2] === id),
            });
        },
    });
}
