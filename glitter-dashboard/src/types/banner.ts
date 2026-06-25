export type BannerStatus = 'active' | 'inactive' | 'scheduled' | 'archived';
export type BannerPlacement =
    | 'home_hero'
    | 'home_secondary'
    | 'category_top'
    | 'checkout';

export const BANNER_PLACEMENTS: BannerPlacement[] = [
    'home_hero',
    'home_secondary',
    'category_top',
    'checkout',
];
export const BANNER_STATUSES: BannerStatus[] = [
    'active',
    'inactive',
    'scheduled',
    'archived',
];

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
    bannerType: string;
    bannerEvent: string;
    status: BannerStatus;
    startDate: string | null;
    endDate: string | null;
    displayOrder: number;
    placements: BannerPlacement[];
    createdAt: string;
    updatedAt: string;
}

export interface BannerFormValues {
    titleEn?: string | null;
    titleKm?: string | null;
    imageUrl: string;
    imageAltText?: string | null;
    linkUrl?: string | null;
    descriptionEn?: string | null;
    descriptionKm?: string | null;
    buttonLabelEn?: string | null;
    buttonLabelKm?: string | null;
    status?: BannerStatus;
    startDate?: string | null;
    endDate?: string | null;
    placements?: BannerPlacement[];
    displayOrder?: number;
}

export interface BannerListResponse {
    data: Banner[];
    total: number;
}
