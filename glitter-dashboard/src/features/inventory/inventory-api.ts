import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/** Stock at/below this many units flags a variant as "low". */
export const LOW_STOCK_THRESHOLD = 5;

/** Products per page in the inventory list. */
export const INVENTORY_PAGE_SIZE = 20;

export interface InventoryVariantRow {
    inventoryId: string;
    variantId: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
}

export interface InventoryProductGroup {
    productId: string;
    sku: string;
    nameEn: string;
    nameKm: string;
    slug: string;
    primaryImageUrl: string | null;
    totalAvailable: number;
    totalReserved: number;
    totalDamaged: number;
    variants: InventoryVariantRow[];
}

export interface BranchInventory {
    data: InventoryProductGroup[];
    total: number;
    page: number;
    limit: number;
}

export interface BranchSummary {
    branchId: string;
    totalVariants: number;
    totalUnitsAvailable: number;
    totalUnitsReserved: number;
    totalUnitsDamaged: number;
}

const KEY = ['inventory'] as const;

export function useBranchInventory(
    branchId: string | undefined,
    page: number,
    search: string,
) {
    return useQuery({
        queryKey: [...KEY, 'branch', branchId, page, search],
        enabled: Boolean(branchId),
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const { data } = await apiClient.get<BranchInventory>(
                `/api/inventory-branch/branch/${branchId}`,
                {
                    params: {
                        page,
                        limit: INVENTORY_PAGE_SIZE,
                        search: search || undefined,
                    },
                },
            );
            return data;
        },
    });
}

export function useBranchSummary(branchId: string | undefined) {
    return useQuery({
        queryKey: [...KEY, 'summary', branchId],
        enabled: Boolean(branchId),
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: BranchSummary }>(
                `/api/inventory-branch/branch/${branchId}/summary`,
            );
            return data.data;
        },
    });
}

export function useSetStock() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: {
            productVariantId: string;
            branchId: string;
            quantityAvailable: number;
        }) => apiClient.post('/api/inventory-branch/set', body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: KEY });
            void qc.invalidateQueries({ queryKey: ['products'] });
        },
    });
}
