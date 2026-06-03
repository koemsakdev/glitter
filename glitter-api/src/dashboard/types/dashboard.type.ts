export interface DashboardStatsResponse {
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
  recentProducts: Array<{
    id: string;
    nameEn: string;
    nameKm: string;
    sku: string;
    price: number;
    status: string;
    totalStock: number;
    primaryImageUrl: string | null;
    createdAt: Date;
  }>;
  lowStockVariants: Array<{
    id: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityInStock: number;
    productId: string;
    productNameEn: string;
    productNameKm: string;
  }>;
  recentlyUpdated: Array<{
    id: string;
    nameEn: string;
    nameKm: string;
    sku: string;
    price: number;
    status: string;
    primaryImageUrl: string | null;
    updatedAt: Date;
  }>;
  topBrands: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    productCount: number;
  }>;
  topCategories: Array<{
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl: string | null;
    productCount: number;
  }>;
  inventory: {
    totalValue: number;
    averagePrice: number;
    averageStockPerProduct: number;
  };
}
