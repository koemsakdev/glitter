import { apiClient } from '@/lib/api-client';
import type {
    BranchInventoryGroupedResponse,
    BranchInventoryParams,
    BranchInventorySummary,
    CreateInventoryBranchPayload,
    InventoryBranchRecord,
    InventoryListParams,
    ProductAvailability,
    ReserveStockPayload,
    TransferStockPayload,
    UpdateInventoryBranchPayload,
} from '@/types/inventory-branch';

interface ApiEnvelope<T> {
    data: T;
}

interface ListEnvelope<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

const BASE = '/api/inventory-branch';

export const inventoryBranchApi = {
    // ---------- Read ----------
    async list(params?: InventoryListParams): Promise<ListEnvelope<InventoryBranchRecord>> {
        const { data } = await apiClient.get<ListEnvelope<InventoryBranchRecord>>(BASE, {
            params,
        });
        return data;
    },

    /**
     * Get all inventory for a product across branches.
     * Used by: product detail page "Available at" section.
     */
    async getProductAvailability(productId: string): Promise<ProductAvailability> {
        const { data } = await apiClient.get<ApiEnvelope<ProductAvailability>>(
            `${BASE}/product/${productId}/availability`,
        );
        return data.data;
    },

    /**
     * Get inventory at a branch, grouped by product and paginated.
     * Used by: the branch detail page inventory section.
     */
    async getByBranch(
        branchId: string,
        params?: BranchInventoryParams,
    ): Promise<BranchInventoryGroupedResponse> {
        const { data } = await apiClient.get<BranchInventoryGroupedResponse>(
            `${BASE}/branch/${branchId}`,
            { params },
        );
        return data;
    },

    /**
     * Get inventory totals for a branch (variant count, total units, etc.)
     */
    async getBranchSummary(branchId: string): Promise<BranchInventorySummary> {
        const { data } = await apiClient.get<ApiEnvelope<BranchInventorySummary>>(
            `${BASE}/branch/${branchId}/summary`,
        );
        return data.data;
    },

    /**
     * Get all inventory rows for one variant (across branches).
     * Used by: variant editor per-branch stock fields.
     */
    async getByVariant(variantId: string): Promise<InventoryBranchRecord[]> {
        const { data } = await apiClient.get<ListEnvelope<InventoryBranchRecord>>(
            `${BASE}/variant/${variantId}`,
        );
        return data.data;
    },

    async getById(id: string): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.get<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/${id}`,
        );
        return data.data;
    },

    // ---------- Mutations ----------

    async create(payload: CreateInventoryBranchPayload): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.post<ApiEnvelope<InventoryBranchRecord>>(
            BASE,
            payload,
        );
        return data.data;
    },

    /** Create or update a variant's stock at a branch (upsert). */
    async setStock(
        payload: CreateInventoryBranchPayload,
    ): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.post<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/set`,
            payload,
        );
        return data.data;
    },

    async update(
        id: string,
        payload: UpdateInventoryBranchPayload,
    ): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.patch<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/${id}`,
            payload,
        );
        return data.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },

    // ---------- Stock operations ----------

    async reserve(payload: ReserveStockPayload): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.post<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/reserve`,
            payload,
        );
        return data.data;
    },

    async releaseReservation(
        payload: ReserveStockPayload,
    ): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.post<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/release-reservation`,
            payload,
        );
        return data.data;
    },

    async commitReservation(
        payload: ReserveStockPayload,
    ): Promise<InventoryBranchRecord> {
        const { data } = await apiClient.post<ApiEnvelope<InventoryBranchRecord>>(
            `${BASE}/commit-reservation`,
            payload,
        );
        return data.data;
    },

    async transfer(payload: TransferStockPayload): Promise<{
        from: InventoryBranchRecord;
        to: InventoryBranchRecord;
    }> {
        const { data } = await apiClient.post<{
            from: InventoryBranchRecord;
            to: InventoryBranchRecord;
        }>(`${BASE}/transfer`, payload);
        return data;
    },
};