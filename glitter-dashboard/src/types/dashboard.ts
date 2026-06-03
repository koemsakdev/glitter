import type { ProductStatus } from './product';

export interface DashboardStats {
    products: {
        total: number;
        active: number;
        draft: number;
        outOfStock: number;
        archived: number;
        discontinued: number;
    };
    brands: {
        total: number;
        active: number;
    };
    categories: {
        total: number;
    };
    variants: {
        totalStockUnits: number;
        outOfStockCount: number;
        lowStockCount: number;
    };
    recentProducts: RecentProduct[];
    lowStockVariants: LowStockVariant[];
    recentlyUpdated: RecentlyUpdatedProduct[];
    topBrands: TopBrand[];
    topCategories: TopCategory[];
    inventory: InventorySummary;
}

export interface RecentProduct {
    id: string;
    nameEn: string;
    nameKm: string;
    sku: string;
    price: number;
    status: ProductStatus;
    totalStock: number;
    primaryImageUrl: string | null;
    createdAt: string;
}

export interface LowStockVariant {
    id: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityInStock: number;
    productId: string;
    productNameEn: string;
    productNameKm: string;
}

export interface RecentlyUpdatedProduct {
    id: string;
    nameEn: string;
    nameKm: string;
    sku: string;
    price: number;
    status: ProductStatus;
    primaryImageUrl: string | null;
    updatedAt: string;
}

export interface TopBrand {
    id: string;
    name: string;
    logoUrl: string | null;
    productCount: number;
}

export interface TopCategory {
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl: string | null;
    productCount: number;
}

export interface InventorySummary {
    totalValue: number;
    averagePrice: number;
    averageStockPerProduct: number;
}