import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchApi } from './branch-api';
import type { BranchFormValues, BranchListParams } from '@/types/branch';

const BRANCHES_KEY = ['branches'] as const;

export function useBranches(params?: BranchListParams) {
    return useQuery({
        queryKey: [...BRANCHES_KEY, 'list', params],
        queryFn: () => branchApi.list(params),
    });
}

export function useActiveBranches() {
    return useQuery({
        queryKey: [...BRANCHES_KEY, 'active'],
        queryFn: () => branchApi.listActive(),
        staleTime: 5 * 60 * 1000, // 5 min — rarely changes
    });
}

export function useBranch(id: string | undefined) {
    return useQuery({
        queryKey: [...BRANCHES_KEY, 'detail', id],
        queryFn: () => branchApi.getById(id!),
        enabled: Boolean(id),
    });
}

export function useCreateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: BranchFormValues) => branchApi.create(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
        },
    });
}

export function useUpdateBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         id,
                         values,
                     }: {
            id: string;
            values: Partial<BranchFormValues>;
        }) => branchApi.update(id, values),
        onSuccess: (_data, { id }) => {
            void queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
            void queryClient.invalidateQueries({
                queryKey: [...BRANCHES_KEY, 'detail', id],
            });
        },
    });
}

export function useDeleteBranch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => branchApi.delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: BRANCHES_KEY });
        },
    });
}