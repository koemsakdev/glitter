export interface ProductImage {
    id: string;
    imageUrl: string;
    imageType: string;
    imageAltTextEn?: string | null;
}

export interface ProductVariant {
    id: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityInStock: number;
    priceOverride: number | null;
    effectivePrice: number;
}

export interface Product {
    id: string;
    sku: string;
    nameEn: string;
    nameKm: string;
    slug: string;
    descriptionEn: string | null;
    descriptionKm: string | null;
    detailsEn: string | null;
    detailsKm: string | null;
    price: number;
    originalPrice: number | null;
    productType: string;
    status: string;
    totalStock: number;
    averageRating: number;
    reviewCount: number;
    brandId: string;
    categoryId: string;
    images?: ProductImage[];
    variants?: ProductVariant[];
}

export interface Category {
    id: string;
    nameEn: string;
    nameKm: string;
    slug: string;
    iconUrl: string | null;
}

export interface Brand {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
}

export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface BranchAvailability {
    branchId: string;
    branchNameEn: string;
    branchNameKm: string;
    variantId: string;
    quantityAvailable: number;
}

export interface ProductAvailability {
    productId: string;
    branches: BranchAvailability[];
}
