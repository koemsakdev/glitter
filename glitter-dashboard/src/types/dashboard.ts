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
    bestSelling: TopProduct[];
    mostBought: TopProduct[];
    sales: SalesSummary;
    ordersByStatus: OrdersByStatus;
    salesSeries: SalesPoint[];
    recentOrders: RecentOrder[];
    range: DashboardRange;
}

export type SalesGranularity = 'day' | 'week' | 'month';

export interface DashboardRange {
    from: string;
    to: string;
    granularity: SalesGranularity;
}

export interface SalesSummary {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    prevRevenue: number;
    prevOrders: number;
    pendingOrders: number;
    customers: number;
}

export interface OrdersByStatus {
    pending: number;
    paid: number;
    processing: number;
    shipped: number;
    completed: number;
    cancelled: number;
    refunded: number;
}

export interface SalesPoint {
    day: string;
    orders: number;
    revenue: number;
}

export interface RecentOrder {
    id: string;
    orderNumber: string;
    customerName: string | null;
    grandTotal: number;
    status: string;
    source: string;
    createdAt: string;
}

export interface TopProduct {
    id: string;
    nameEn: string;
    nameKm: string;
    sku: string;
    price: number;
    primaryImageUrl: string | null;
    count: number;
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