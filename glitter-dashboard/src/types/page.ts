export interface Page {
    id: string;
    slug: string;
    titleEn: string;
    titleKm: string;
    bodyEn: string | null;
    bodyKm: string | null;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PageListResponse {
    data: Page[];
}

export interface PageDetailResponse {
    data: Page;
}

export interface PageFormValues {
    slug: string;
    titleEn: string;
    titleKm: string;
    bodyEn?: string;
    bodyKm?: string;
    isPublished: boolean;
}
