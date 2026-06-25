import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Shipment, ShipmentFormValues } from '@/types/shipment';

const SHIPMENTS_KEY = ['shipments'] as const;

export function useOrderShipment(orderId: string | undefined) {
    return useQuery({
        queryKey: [...SHIPMENTS_KEY, 'order', orderId],
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: Shipment | null }>(
                `/api/shipments/order/${orderId}`,
            );
            return data.data;
        },
        enabled: Boolean(orderId),
    });
}

export function useCreateShipment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderId,
            values,
        }: {
            orderId: string;
            values: ShipmentFormValues;
        }) => {
            const { data } = await apiClient.post<Shipment>('/api/shipments', {
                orderId,
                ...values,
            });
            return data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: SHIPMENTS_KEY });
        },
    });
}

export function useUpdateShipment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            values,
        }: {
            id: string;
            values: ShipmentFormValues;
        }) => {
            const { data } = await apiClient.patch<Shipment>(
                `/api/shipments/${id}`,
                values,
            );
            return data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: SHIPMENTS_KEY });
        },
    });
}
