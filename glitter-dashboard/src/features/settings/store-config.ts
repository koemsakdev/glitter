/**
 * The storefront configuration, edited in the dashboard and read by the store.
 * Persisted as a single JSON `app_settings` row (group `storefront`, key
 * `home_config`, isPublic=true). All customer-facing text is bilingual (EN/KM).
 */

export type HomeSectionType = 'new-arrivals' | 'categories';

export interface HomeSection {
    id: string;
    type: HomeSectionType;
    titleEn: string;
    titleKm: string;
    enabled: boolean;
}

export interface StoreBanner {
    id: string;
    imageUrl: string;
    titleEn: string;
    titleKm: string;
    href: string;
    enabled: boolean;
}

export type FontScale = 'sm' | 'md' | 'lg';
export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type Density = 'compact' | 'comfortable';

/** Storefront look & feel — applied via CSS variables on the store root. */
export interface StoreAppearance {
    fontScale: FontScale;
    /** CSS font-family value, or '' to use the store default. */
    fontFamily: string;
    radius: RadiusPreset;
    density: Density;
}

export const FONT_FAMILY_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'system-ui, sans-serif', label: 'System' },
    { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
    { value: '"Trebuchet MS", "Segoe UI", sans-serif', label: 'Rounded' },
    { value: 'ui-monospace, monospace', label: 'Monospace' },
] as const;

export interface StoreConfig {
    brandNameEn: string;
    brandNameKm: string;
    taglineEn: string;
    taglineKm: string;

    themeColor: string; // hex, e.g. #ec4899

    appearance: StoreAppearance;

    announcementEnabled: boolean;
    announcementEn: string;
    announcementKm: string;

    heroTitleEn: string;
    heroTitleKm: string;
    heroSubtitleEn: string;
    heroSubtitleKm: string;
    heroCtaEn: string;
    heroCtaKm: string;
    heroCtaHref: string;

    contactPhone: string;
    contactEmail: string;
    contactAddressEn: string;
    contactAddressKm: string;

    facebookUrl: string;
    instagramUrl: string;
    telegramUrl: string;

    banners: StoreBanner[];
    sections: HomeSection[];
}

export const STORE_CONFIG_GROUP = 'storefront';
export const STORE_CONFIG_KEY = 'home_config';

export const DEFAULT_STORE_CONFIG: StoreConfig = {
    brandNameEn: 'Glitter',
    brandNameKm: 'Glitter',
    taglineEn: 'Beauty & glitter, Phnom Penh.',
    taglineKm: 'សម្ផស្ស និងពន្លឺ ភ្នំពេញ។',

    themeColor: '#ec4899',

    appearance: {
        fontScale: 'md',
        fontFamily: '',
        radius: 'lg',
        density: 'comfortable',
    },

    announcementEnabled: true,
    announcementEn: 'Free pickup at our Phnom Penh branches — visit us today! ✨',
    announcementKm: 'ទទួលទំនិញដោយឥតគិតថ្លៃនៅសាខាភ្នំពេញ — អញ្ជើញថ្ងៃនេះ! ✨',

    heroTitleEn: 'Sparkle in every shade.',
    heroTitleKm: 'ភ្លឺចែងចាំងគ្រប់ពណ៌។',
    heroSubtitleEn:
        'Discover glitter and beauty essentials, fresh from our Phnom Penh branches.',
    heroSubtitleKm:
        'ស្វែងរកផលិតផលសម្ផស្ស និងពន្លឺ ថ្មីៗពីសាខាភ្នំពេញរបស់យើង។',
    heroCtaEn: 'Shop now',
    heroCtaKm: 'ទិញឥឡូវនេះ',
    heroCtaHref: '/products',

    contactPhone: '+855 12 345 678',
    contactEmail: 'hello@glitter.shop',
    contactAddressEn: 'St. 432, Toul Tompong, Phnom Penh, Cambodia',
    contactAddressKm: 'ផ្លូវ ៤៣២ ទួលទំពូង ភ្នំពេញ កម្ពុជា',

    facebookUrl: 'https://facebook.com/glittershop',
    instagramUrl: 'https://instagram.com/glittershop',
    telegramUrl: 'https://t.me/glittershop',

    banners: [],

    sections: [
        {
            id: 'categories',
            type: 'categories',
            titleEn: 'Shop by category',
            titleKm: 'ទិញតាមប្រភេទ',
            enabled: true,
        },
        {
            id: 'new-arrivals',
            type: 'new-arrivals',
            titleEn: 'New arrivals',
            titleKm: 'ទំនិញថ្មី',
            enabled: true,
        },
    ],
};

/** Merge a parsed config with defaults so new fields always have a value. */
export function mergeStoreConfig(partial: unknown): StoreConfig {
    const p = (partial ?? {}) as Partial<StoreConfig>;
    return {
        ...DEFAULT_STORE_CONFIG,
        ...p,
        appearance: {
            ...DEFAULT_STORE_CONFIG.appearance,
            ...(p.appearance ?? {}),
        },
        banners: Array.isArray(p.banners) ? p.banners : [],
        sections:
            Array.isArray(p.sections) && p.sections.length > 0
                ? p.sections
                : DEFAULT_STORE_CONFIG.sections,
    };
}
