import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from './category-api';
import type { CategoryFormValues, CategoryQuery } from '@/types/category';
import { removeFromCache } from '@/lib/remove-from-cache';

const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(query: CategoryQuery) {
    return useQuery({
        queryKey: [...CATEGORIES_KEY, query],
        queryFn: () => categoryApi.list(query),
    });
}

export function useCategory(id: string | undefined) {
    return useQuery({
        queryKey: [...CATEGORIES_KEY, 'detail', id],
        queryFn: () => categoryApi.getById(id!),
        enabled: Boolean(id),
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: CategoryFormValues) => categoryApi.create(values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            values,
        }: {
            id: string;
            values: CategoryFormValues;
        }) => categoryApi.update(id, values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => categoryApi.delete(id),
        onSuccess: (_data, id) => {
            removeFromCache(queryClient, CATEGORIES_KEY, id);
            void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
        },
    });
}
