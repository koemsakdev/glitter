import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { productApi } from './product-api';
import type { ProductFormValues, ProductQuery } from '@/types/product';

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
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        },
    });
}