import type { CSSProperties } from 'react';

/** Convert a #rrggbb hex to an rgba() string with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    if (h.length < 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Tinted badge style that reads well in both light and dark mode: a low-opacity
 * background of the chosen colour with the same colour as the text.
 */
export function badgeTintStyle(hex: string): CSSProperties {
    return {
        color: hex,
        backgroundColor: hexToRgba(hex, 0.15),
        borderColor: hexToRgba(hex, 0.3),
    };
}

/** A badge slug from the dynamic catalog. Free-form so admins can add types. */
export type BadgeType = string;

/** The original built-in badge slugs (kept as fallback display defaults). */
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

/** Minimal shape of a catalog badge needed to resolve display values. */
export interface BadgeCatalogEntry {
    slug: string;
    nameEn: string;
    nameKm: string;
    color: string;
}

/**
 * Resolve a badge's displayed label and color. Priority: per-product override →
 * the live badges catalog (by slug) → built-in defaults → neutral fallback.
 * Catalog-aware and crash-safe for custom badge slugs.
 */
export function resolveBadgeDisplay(
    badge: Pick<
        ProductBadge,
        'badgeType' | 'badgeLabelEn' | 'badgeLabelKm' | 'badgeIconColor'
    >,
    language: 'en' | 'km',
    catalog?: BadgeCatalogEntry[],
) {
    const cat = catalog?.find((b) => b.slug === badge.badgeType);
    const defaults = BADGE_DEFAULTS[badge.badgeType as BadgeType] as
        | { labelEn: string; labelKm: string; color: string }
        | undefined;

    const labelEn =
        badge.badgeLabelEn?.trim() ||
        cat?.nameEn ||
        defaults?.labelEn ||
        badge.badgeType;
    const labelKm =
        badge.badgeLabelKm?.trim() ||
        cat?.nameKm ||
        defaults?.labelKm ||
        badge.badgeType;
    const label = language === 'km' ? labelKm : labelEn;
    const color =
        badge.badgeIconColor?.trim() ||
        cat?.color ||
        defaults?.color ||
        '#64748b';
    return {label, color};
}