export type BadgeType =
    | 'new'
    | 'sale'
    | 'bestseller'
    | 'limited'
    | 'exclusive'
    | 'hot'
    | 'featured'
    | 'coming_soon';

export const ALL_BADGE_TYPES: BadgeType[] = [
    'new',
    'sale',
    'bestseller',
    'limited',
    'exclusive',
    'hot',
    'featured',
    'coming_soon',
];

export interface ProductBadge {
    id: string;
    productId: string;
    badgeType: BadgeType;
    badgeLabelEn: string | null;
    badgeLabelKm: string | null;
    badgeIconColor: string | null;
    badgeStartDate: string | null;
    badgeEndDate: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface CreateBadgePayload {
    productId: string;
    badgeType: BadgeType;
    badgeLabelEn?: string;
    badgeLabelKm?: string;
    badgeIconColor?: string;
    badgeStartDate?: string;
    badgeEndDate?: string;
}

/**
 * Default visual config for each badge type.
 * Used when the badge has no custom label or color.
 */
export const BADGE_DEFAULTS: Record<
    BadgeType,
    { labelEn: string; labelKm: string; color: string }
> = {
    new: {labelEn: 'New', labelKm: 'ថ្មី', color: '#ec4899'},
    sale: {labelEn: 'Sale', labelKm: 'បញ្ចុះតម្លៃ', color: '#ef4444'},
    bestseller: {labelEn: 'Bestseller', labelKm: 'លក់ដាច់', color: '#f59e0b'},
    limited: {labelEn: 'Limited', labelKm: 'មានកំណត់', color: '#a855f7'},
    exclusive: {labelEn: 'Exclusive', labelKm: 'ផ្តាច់មុខ', color: '#eab308'},
    hot: {labelEn: 'Hot', labelKm: 'ក្តៅ', color: '#f97316'},
    featured: {labelEn: 'Featured', labelKm: 'លេចធ្លោ', color: '#ec4899'},
    coming_soon: {
        labelEn: 'Coming Soon',
        labelKm: 'មកដល់',
        color: '#64748b',
    },
};

/**
 * Resolve a badge's displayed label and color, using overrides if present, defaults otherwise.
 */
export function resolveBadgeDisplay(
    badge: Pick<
        ProductBadge,
        'badgeType' | 'badgeLabelEn' | 'badgeLabelKm' | 'badgeIconColor'
    >,
    language: 'en' | 'km',
) {
    const defaults = BADGE_DEFAULTS[badge.badgeType];
    const label =
        language === 'km'
            ? badge.badgeLabelKm?.trim() || defaults.labelKm
            : badge.badgeLabelEn?.trim() || defaults.labelEn;
    const color = badge.badgeIconColor?.trim() || defaults.color;
    return {label, color};
}