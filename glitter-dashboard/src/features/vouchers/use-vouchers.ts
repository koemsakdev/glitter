import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Voucher, VoucherFormValues } from '@/types/voucher';

const VOUCHERS_KEY = ['vouchers'] as const;

export function useVouchers() {
    return useQuery({
        queryKey: VOUCHERS_KEY,
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: Voucher[] }>(
                '/api/vouchers',
            );
            return data.data;
        },
    });
}

export function useCreateVoucher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values: VoucherFormValues) => {
            const { data } = await apiClient.post<{ data: Voucher }>(
                '/api/vouchers',
                values,
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VOUCHERS_KEY });
        },
    });
}

export function useUpdateVoucher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: Partial<VoucherFormValues>;
        }) => {
            const { data } = await apiClient.patch<{ data: Voucher }>(
                `/api/vouchers/${id}`,
                values,
            );
            return data.data;
        },
        // Optimistic so the active switch responds instantly.
        onMutate: async ({ id, values }) => {
            await queryClient.cancelQueries({ queryKey: VOUCHERS_KEY });
            const previous =
                queryClient.getQueryData<Voucher[]>(VOUCHERS_KEY);
            queryClient.setQueryData<Voucher[]>(VOUCHERS_KEY, (old) =>
                old?.map((v) => (v.id === id ? { ...v, ...values } : v)),
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(VOUCHERS_KEY, context.previous);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: VOUCHERS_KEY });
        },
    });
}

export function useDeleteVoucher() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/vouchers/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: VOUCHERS_KEY });
        },
    });
}
