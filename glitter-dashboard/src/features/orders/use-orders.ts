import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { orderApi } from './order-api';
import type {
    CreateOrderPayload,
    OrderPaymentStatus,
    OrderQuery,
    OrderStatus,
} from '@/types/order';

const ORDERS_KEY = ['orders'] as const;

export function useOrders(query: OrderQuery) {
    return useQuery({
        queryKey: [...ORDERS_KEY, 'list', query],
        queryFn: () => orderApi.list(query),
        placeholderData: keepPreviousData,
    });
}

export function useOrderStats(branchId: string | null) {
    return useQuery({
        queryKey: [...ORDERS_KEY, 'stats', branchId],
        queryFn: () => orderApi.getStats(branchId ?? undefined),
    });
}

export function useOrder(id: string | undefined) {
    return useQuery({
        queryKey: [...ORDERS_KEY, 'detail', id],
        queryFn: () => orderApi.getById(id!),
        enabled: Boolean(id),
    });
}

/**
 * Orders mutate branch stock, so we also invalidate inventory and product
 * queries to keep stock numbers fresh everywhere.
 */
function useInvalidateAfterOrder() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
        void queryClient.invalidateQueries({ queryKey: ['inventory-branch'] });
        void queryClient.invalidateQueries({ queryKey: ['products'] });
        void queryClient.invalidateQueries({ queryKey: ['product-variants'] });
    };
}

export function useCreateOrder() {
    const invalidate = useInvalidateAfterOrder();
    return useMutation({
        mutationFn: (payload: CreateOrderPayload) => orderApi.create(payload),
        onSuccess: invalidate,
    });
}

export function useUpdateOrderStatus() {
    const invalidate = useInvalidateAfterOrder();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
            orderApi.updateStatus(id, status),
        onSuccess: invalidate,
    });
}

export function useUpdatePaymentStatus() {
    const invalidate = useInvalidateAfterOrder();
    return useMutation({
        mutationFn: ({
            id,
            paymentStatus,
        }: {
            id: string;
            paymentStatus: OrderPaymentStatus;
        }) => orderApi.updatePaymentStatus(id, paymentStatus),
        onSuccess: invalidate,
    });
}
