export interface Badge {
    id: string;
    slug: string;
    nameEn: string;
    nameKm: string;
    color: string;
    active: boolean;
    displayOrder: number;
}

export interface BadgeFormValues {
    nameEn: string;
    nameKm: string;
    color: string;
    active?: boolean;
}
