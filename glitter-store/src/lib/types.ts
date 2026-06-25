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

export interface Branch {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
    streetAddress: string;
    city: string;
    phoneNumber: string;
}

export interface Advertisement {
    id: string;
    titleEn: string;
    titleKm: string;
    contentEn: string | null;
    contentKm: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
}

export interface Banner {
    id: string;
    titleEn: string;
    titleKm: string;
    imageUrl: string;
    imageAltText: string | null;
    linkUrl: string | null;
    descriptionEn: string | null;
    descriptionKm: string | null;
    buttonLabelEn: string | null;
    buttonLabelKm: string | null;
}

export interface Review {
    id: string;
    reviewerName: string;
    rating: number;
    titleEn: string | null;
    titleKm: string | null;
    commentEn: string | null;
    commentKm: string | null;
    verifiedPurchase: boolean;
    createdAt: string;
}

export interface ReviewSummary {
    average: number;
    count: number;
}

export interface Page {
    id: string;
    slug: string;
    titleEn: string;
    titleKm: string;
    bodyEn: string | null;
    bodyKm: string | null;
    isPublished: boolean;
}

export type MenuLocation = 'header' | 'footer';

export interface MenuItem {
    id: string;
    labelEn: string;
    labelKm: string;
    url: string;
    location: MenuLocation;
    parentId: string | null;
    displayOrder: number;
    isActive: boolean;
    openInNewTab: boolean;
}
