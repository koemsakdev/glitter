import { useQuery } from '@tanstack/react-query';
import { userApi } from './user-api';

/** Customers for pickers (e.g. attaching a customer to an order). */
export function useCustomers(search?: string) {
    return useQuery({
        queryKey: ['users', 'customers', search ?? ''],
        queryFn: () => userApi.listCustomers(search),
        staleTime: 60_000,
    });
}
