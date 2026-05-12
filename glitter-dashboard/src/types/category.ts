export type CategoryType = 'main' | 'sub' | 'featured';

export type CategorySortBy =
    | 'createdAt'
    | 'updatedAt'
    | 'nameEn'
    | 'nameKm'
    | 'displayOrder';

export type CategorySortOrder = 'ASC' | 'DESC';

export interface Category {
    id: string;
    slug: string;
    nameEn: string;
    nameKm: string;
    descriptionEn: string | null;
    descriptionKm: string | null;
    iconUrl: string | null;
    displayOrder: number;
    categoryType: CategoryType;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryListResponse {
    data: Category[];
    total: number;
    page: number;
    limit: number;
}

export interface CategoryQuery {
    page?: number;
    limit?: number;
    search?: string;
    categoryType?: CategoryType;
    sortBy?: CategorySortBy;
    sortOrder?: CategorySortOrder;
}

export interface CategoryFormValues {
    slug: string;
    nameEn: string;
    nameKm: string;
    descriptionEn?: string;
    descriptionKm?: string;
    displayOrder?: number;
    categoryType: CategoryType;
    icon?: File | null;
    clearIcon?: boolean;
}