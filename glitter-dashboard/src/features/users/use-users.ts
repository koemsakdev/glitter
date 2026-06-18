import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { userApi } from './user-api';
import type { UserFormValues, UserQuery } from '@/types/user';

const USERS_KEY = ['users'] as const;

export function useUsers(query: UserQuery) {
    return useQuery({
        queryKey: [...USERS_KEY, 'list', query],
        queryFn: () => userApi.list(query),
        placeholderData: keepPreviousData,
    });
}

export function useUser(id: string | undefined) {
    return useQuery({
        queryKey: [...USERS_KEY, 'detail', id],
        queryFn: () => userApi.getById(id!),
        enabled: Boolean(id),
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: UserFormValues) => userApi.create(payload),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UserFormValues }) =>
            userApi.update(id, payload),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => userApi.remove(id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    });
}

export function useUploadUserAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) =>
            userApi.uploadAvatar(id, file),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    });
}

export function useRemoveUserAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => userApi.removeAvatar(id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    });
}

/** Customers for pickers (e.g. attaching a customer to an order). */
export function useCustomers(search?: string) {
    return useQuery({
        queryKey: ['users', 'customers', search ?? ''],
        queryFn: () => userApi.listCustomers(search),
        staleTime: 60_000,
    });
}
