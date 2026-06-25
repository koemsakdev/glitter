export type AdType = 'banner' | 'popup' | 'inline' | 'sidebar';
export type AdStatus = 'active' | 'inactive' | 'scheduled' | 'archived';
export type PlacementLocation =
    | 'home_top'
    | 'home_middle'
    | 'sidebar'
    | 'product_page'
    | 'footer';

export const PLACEMENT_LOCATIONS: PlacementLocation[] = [
    'home_top',
    'home_middle',
    'sidebar',
    'product_page',
    'footer',
];
export const AD_STATUSES: AdStatus[] = [
    'active',
    'inactive',
    'scheduled',
    'archived',
];

export interface Advertisement {
    id: string;
    titleEn: string;
    titleKm: string;
    contentEn: string | null;
    contentKm: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    adType: AdType;
    displayFrequency: number;
    viewCount: number;
    clickCount: number;
    status: AdStatus;
    startDate: string | null;
    endDate: string | null;
    placements: PlacementLocation[];
    createdAt: string;
    updatedAt: string;
}

export interface AdvertisementFormValues {
    titleEn: string;
    titleKm: string;
    contentEn?: string | null;
    contentKm?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    status?: AdStatus;
    startDate?: string | null;
    endDate?: string | null;
    placements?: PlacementLocation[];
}

export interface AdvertisementListResponse {
    data: Advertisement[];
    total: number;
}
