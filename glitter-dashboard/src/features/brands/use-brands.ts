'use client';

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { brandApi } from './brand-api';
import type { BrandFormValues, BrandQuery } from '@/types/brand';

const BRANDS_KEY = ['brands'] as const;

export function useBrands(query: BrandQuery = {}) {
    return useQuery({
        queryKey: [...BRANDS_KEY, query],
        queryFn: () => brandApi.list(query),
        placeholderData: (prev) => prev,
    });
}

export function useBrand(id: string | null) {
    return useQuery({
        queryKey: [...BRANDS_KEY, 'detail', id],
        queryFn: () => brandApi.getById(id!),
        enabled: Boolean(id),
    });
}

export function useCreateBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: BrandFormValues) => brandApi.create(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
        },
    });
}

export function useUpdateBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, values }: { id: string; values: BrandFormValues }) =>
            brandApi.update(id, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => brandApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
        },
    });
}