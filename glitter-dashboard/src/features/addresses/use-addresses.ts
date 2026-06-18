import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressApi } from './address-api';
import type { AddressFormValues } from '@/types/address';

const ADDRESSES_KEY = ['addresses'] as const;

export function useUserAddresses(userId: string | undefined) {
    return useQuery({
        queryKey: [...ADDRESSES_KEY, 'byUser', userId],
        queryFn: () => addressApi.listByUser(userId!),
        enabled: Boolean(userId),
    });
}

export function useCreateAddress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddressFormValues) => addressApi.create(payload),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
    });
}

export function useUpdateAddress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: AddressFormValues;
        }) => addressApi.update(id, payload),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
    });
}

export function useDeleteAddress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => addressApi.remove(id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
    });
}

export function useSetDefaultShipping() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => addressApi.setDefaultShipping(id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
    });
}

export function useSetDefaultBilling() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => addressApi.setDefaultBilling(id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
    });
}
