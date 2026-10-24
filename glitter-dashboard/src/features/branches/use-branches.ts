import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchApi } from './branch-api';
import { useLockedBranchId } from '@/stores/use-branch-context';
import type {
    Branch,
    BranchFormValues,
    BranchListParams,
} from '@/types/branch';

const BRANCHES_KEY = ['branches'] as const;

export function useBranches(params?: BranchListParams) {
    return useQuery({
        queryKey: [...BRANCHES_KEY, 'list', params],
        queryFn: () => branchApi.list(params),
    });
}

/**
 * Branches the signed-in staff member may work with. Admins get every active
 * branch; managers/cashiers get only their own, so no picker, list or stock
 * table anywhere in the dashboard can show or offer another branch.
 */
export function useActiveBranches() {
    const lockedBranchId = useLockedBranchId();
    return useQuery({
        queryKey: [...BRANCHES_KEY, 'active'],
        queryFn: () => branchApi.listActive(),
        staleTime: 5 * 60 * 1000, // 5 min — rarely changes
        select: (branches: Branch[]) =>
            lockedBranchId
                ? branches.filter((b) => b.id === lockedBranchId)
                : branches,
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
