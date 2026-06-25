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
    createdAt: string;
    updatedAt: string;
}

export interface MenuListResponse {
    data: MenuItem[];
}

export interface MenuDetailResponse {
    data: MenuItem;
}

export interface MenuFormValues {
    labelEn: string;
    labelKm: string;
    url: string;
    location: MenuLocation;
    isActive: boolean;
    openInNewTab: boolean;
    displayOrder?: number;
    parentId?: string | null;
}

export interface ReorderMenuItem {
    id: string;
    displayOrder: number;
    parentId?: string | null;
}
