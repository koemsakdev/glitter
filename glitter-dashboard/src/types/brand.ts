export type BrandStatus = 'active' | 'inactive';

export type BrandSortBy = 'createdAt' | 'updatedAt' | 'name';
export type BrandSortOrder = 'ASC' | 'DESC';

export interface Brand {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    description: string | null;
    status: BrandStatus;
    createdAt: string;
    updatedAt: string;
}

export interface BrandListResponse {
    data: Brand[];
    total: number;
    page: number;
    limit: number;
}

export interface BrandQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: BrandStatus;
    sortBy?: BrandSortBy;
    sortOrder?: BrandSortOrder;
}

export interface BrandFormValues {
    name: string;
    slug: string;
    websiteUrl?: string;
    description?: string;
    status: BrandStatus;
    logo?: File | null;
    clearLogo?: boolean;
}