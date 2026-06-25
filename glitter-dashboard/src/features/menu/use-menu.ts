import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { menuApi } from './menu-api';
import type {
    MenuFormValues,
    MenuItem,
    ReorderMenuItem,
} from '@/types/menu';

const MENU_KEY = ['menu'] as const;

export function useMenu() {
    return useQuery({
        queryKey: MENU_KEY,
        queryFn: () => menuApi.list(),
    });
}

export function useCreateMenuItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: MenuFormValues) => menuApi.create(values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: MENU_KEY });
        },
    });
}

export function useUpdateMenuItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            values,
        }: {
            id: string;
            values: Partial<MenuFormValues>;
        }) => menuApi.update(id, values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: MENU_KEY });
        },
    });
}

export function useDeleteMenuItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => menuApi.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: MENU_KEY });
        },
    });
}

export function useReorderMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (items: ReorderMenuItem[]) => menuApi.reorder(items),
        // Optimistically apply the new order to the cache.
        onMutate: async (items) => {
            await queryClient.cancelQueries({ queryKey: MENU_KEY });
            const previous = queryClient.getQueryData<MenuItem[]>(MENU_KEY);
            if (previous) {
                const orderById = new Map(
                    items.map((i) => [i.id, i.displayOrder]),
                );
                const next = [...previous]
                    .map((m) =>
                        orderById.has(m.id)
                            ? { ...m, displayOrder: orderById.get(m.id)! }
                            : m,
                    )
                    .sort((a, b) => a.displayOrder - b.displayOrder);
                queryClient.setQueryData(MENU_KEY, next);
            }
            return { previous };
        },
        onError: (_err, _items, context) => {
            if (context?.previous) {
                queryClient.setQueryData(MENU_KEY, context.previous);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: MENU_KEY });
        },
    });
}
