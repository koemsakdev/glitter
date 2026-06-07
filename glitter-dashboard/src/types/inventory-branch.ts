

/** Embedded variant summary in inventory responses */
export interface InventoryVariantSummary {
    id: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
}

/** Embedded branch summary in inventory responses */
export interface InventoryBranchSummary {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
}

/** Embedded product summary in inventory responses */
export interface InventoryProductSummary {
    id: string;
    sku: string;
    nameEn: string;
    nameKm: string;
    slug: string;
}

/** A single inventory record at a specific branch for a specific variant */
export interface InventoryBranchRecord {
    id: string;
    productVariantId: string;
    branchId: string;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
    /** Computed: available + reserved + damaged */
    totalQuantity: number;
    variant?: InventoryVariantSummary;
    branch?: InventoryBranchSummary;
    product?: InventoryProductSummary;
    createdAt: string;
    updatedAt: string;
}

/** Per-branch availability for one product (across all variants) */
export interface BranchAvailability {
    branchId: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
    variantId: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
    totalQuantity: number;
}

/** Full availability response for a product across branches */
export interface ProductAvailability {
    productId: string;
    nameEn: string;
    nameKm: string;
    branches: BranchAvailability[];
}

/** Summary stats for a branch's inventory */
export interface BranchInventorySummary {
    branchId: string;
    totalVariants: number;
    totalUnitsAvailable: number;
    totalUnitsReserved: number;
    totalUnitsDamaged: number;
}

// ============= Payload types =============

export interface CreateInventoryBranchPayload {
    productVariantId: string;
    branchId: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    quantityDamaged?: number;
}

export interface UpdateInventoryBranchPayload {
    quantityAvailable?: number;
    quantityReserved?: number;
    quantityDamaged?: number;
}

export interface ReserveStockPayload {
    productVariantId: string;
    branchId: string;
    quantity: number;
}

export interface TransferStockPayload {
    productVariantId: string;
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
}

export interface InventoryListParams {
    page?: number;
    limit?: number;
    branchId?: string;
    productVariantId?: string;
}