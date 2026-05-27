export type ProductType = 'standard' | 'featured' | 'limited' | 'exclusive';

export type ProductStatus =
    | 'draft'
    | 'active'
    | 'out_of_stock'
    | 'discontinued'
    | 'archived';

export type ProductSortBy =
    | 'createdAt'
    | 'updatedAt'
    | 'price'
    | 'nameEn'
    | 'averageRating';

export type ProductSortOrder = 'ASC' | 'DESC';

export type ImageType = 'primary' | 'gallery' | 'thumbnail' | 'zoom';

export interface ProductImage {
    id: string;
    imageUrl: string;
    imageAltTextEn: string | null;
    imageAltTextKm: string | null;
    imageType: ImageType;
    displayOrder: number;
}

export interface Product {
    id: string;
    categoryId: string;
    brandId: string;
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
    productType: ProductType;
    status: ProductStatus;
    hasBox: boolean;
    totalStock: number;
    averageRating: number;
    reviewCount: number;
    createdAt: string;
    updatedAt: string;
    images?: ProductImage[];
}

export interface ProductListResponse {
    data: Product[];
    total: number;
    page: number;
    limit: number;
}

export interface ProductQuery {
    page?: number;
    limit?: number;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    productType?: ProductType;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: ProductSortBy;
    sortOrder?: ProductSortOrder;
}

/**
 * Form values used by the product create/edit form.
 * Maps to CreateProductDto on the backend.
 */
export interface ProductFormValues {
    categoryId: string;
    brandId: string;
    sku: string;
    nameEn: string;
    nameKm: string;
    slug: string;
    descriptionEn?: string;
    descriptionKm?: string;
    detailsEn?: string;
    detailsKm?: string;
    price: number;
    originalPrice?: number;
    productType?: ProductType;
    status?: ProductStatus;
    hasBox?: boolean;
}


// ============================================================================
// VARIANTS
// ============================================================================

export interface ProductVariant {
    id: string;
    productId: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    quantityInStock: number;
    priceOverride: number | null;
    effectivePrice: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Variant data used in the form — supports both pending (not yet saved) and saved variants.
 */
export interface VariantFormValue {
    /** Either the server id (for existing variants) or a local id like "pending-{n}" */
    id: string;
    /** True if this variant exists on the server, false if pending creation */
    isExisting: boolean;
    variantSku: string;
    size: string;
    color: string;
    colorHex: string;
    quantityInStock: number;
    priceOverride: number | null;
}

export interface CreateVariantPayload {
    productId: string;
    variantSku: string;
    size?: string;
    color?: string;
    colorHex?: string;
    quantityInStock?: number;
    priceOverride?: number;
}

export interface BulkCreateVariantsPayload {
    productId: string;
    variants: Array<{
        variantSku: string;
        size?: string;
        color?: string;
        colorHex?: string;
        quantityInStock?: number;
        priceOverride?: number;
    }>;
}

export interface UpdateVariantPayload {
    variantSku?: string;
    size?: string | null;
    color?: string | null;
    colorHex?: string | null;
    quantityInStock?: number;
    priceOverride?: number | null;
}