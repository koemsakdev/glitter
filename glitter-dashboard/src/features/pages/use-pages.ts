import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { pagesApi } from './pages-api';
import type { PageFormValues } from '@/types/page';

const PAGES_KEY = ['pages'] as const;

export function usePages() {
    return useQuery({ queryKey: PAGES_KEY, queryFn: () => pagesApi.list() });
}

export function useCreatePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: PageFormValues) => pagesApi.create(values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PAGES_KEY });
        },
    });
}

export function useUpdatePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            values,
        }: {
            id: string;
            values: Partial<PageFormValues>;
        }) => pagesApi.update(id, values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PAGES_KEY });
        },
    });
}

export function useDeletePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => pagesApi.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PAGES_KEY });
        },
    });
}
