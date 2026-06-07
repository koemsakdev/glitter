import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { inventoryBranchApi } from './inventory-branch-api';
import type {
    CreateInventoryBranchPayload,
    InventoryListParams,
    ReserveStockPayload,
    TransferStockPayload,
    UpdateInventoryBranchPayload,
} from '@/types/inventory-branch';

const INVENTORY_KEY = ['inventory-branch'] as const;

// ---------- Queries ----------

export function useInventoryList(params?: InventoryListParams) {
    return useQuery({
        queryKey: [...INVENTORY_KEY, 'list', params],
        queryFn: () => inventoryBranchApi.list(params),
    });
}

/** Per-branch availability for a product — used on product detail page */
export function useProductAvailability(productId: string | undefined) {
    return useQuery({
        queryKey: [...INVENTORY_KEY, 'product-availability', productId],
        queryFn: () => inventoryBranchApi.getProductAvailability(productId!),
        enabled: Boolean(productId),
    });
}

/** All inventory at a branch — used on branch detail page */
export function useBranchInventory(branchId: string | undefined) {
    return useQuery({
        queryKey: [...INVENTORY_KEY, 'by-branch', branchId],
        queryFn: () => inventoryBranchApi.getByBranch(branchId!),
        enabled: Boolean(branchId),
    });
}

/** Branch summary stats — used on branch detail page header */
export function useBranchInventorySummary(branchId: string | undefined) {
    return useQuery({
        queryKey: [...INVENTORY_KEY, 'branch-summary', branchId],
        queryFn: () => inventoryBranchApi.getBranchSummary(branchId!),
        enabled: Boolean(branchId),
    });
}

/** All per-branch rows for one variant — used in variant editor */
export function useVariantInventory(variantId: string | undefined) {
    return useQuery({
        queryKey: [...INVENTORY_KEY, 'by-variant', variantId],
        queryFn: () => inventoryBranchApi.getByVariant(variantId!),
        enabled: Boolean(variantId),
    });
}

// ---------- Mutations ----------

/**
 * After any mutation, invalidate every read key so all dependent UIs refresh.
 * Also invalidates product-variants since variant.quantityInStock is auto-synced.
 */
function useInvalidateInventory() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
        void queryClient.invalidateQueries({ queryKey: ['product-variants'] });
        void queryClient.invalidateQueries({ queryKey: ['products'] });
    };
}

export function useCreateInventoryBranch() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (payload: CreateInventoryBranchPayload) =>
            inventoryBranchApi.create(payload),
        onSuccess: invalidate,
    });
}

export function useUpdateInventoryBranch() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: ({
                         id,
                         payload,
                     }: {
            id: string;
            payload: UpdateInventoryBranchPayload;
        }) => inventoryBranchApi.update(id, payload),
        onSuccess: invalidate,
    });
}

export function useDeleteInventoryBranch() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (id: string) => inventoryBranchApi.delete(id),
        onSuccess: invalidate,
    });
}

export function useReserveStock() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (payload: ReserveStockPayload) =>
            inventoryBranchApi.reserve(payload),
        onSuccess: invalidate,
    });
}

export function useReleaseReservation() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (payload: ReserveStockPayload) =>
            inventoryBranchApi.releaseReservation(payload),
        onSuccess: invalidate,
    });
}

export function useCommitReservation() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (payload: ReserveStockPayload) =>
            inventoryBranchApi.commitReservation(payload),
        onSuccess: invalidate,
    });
}

export function useTransferStock() {
    const invalidate = useInvalidateInventory();
    return useMutation({
        mutationFn: (payload: TransferStockPayload) =>
            inventoryBranchApi.transfer(payload),
        onSuccess: invalidate,
    });
}