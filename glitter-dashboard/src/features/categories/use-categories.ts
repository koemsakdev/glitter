import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { categoryApi } from './category-api';
import type { CategoryFormValues, CategoryQuery } from '@/types/category';

const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(query: CategoryQuery) {
    return useQuery({
        queryKey: [...CATEGORIES_KEY, query],
        queryFn: () => categoryApi.list(query),
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
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
        },
    });
}