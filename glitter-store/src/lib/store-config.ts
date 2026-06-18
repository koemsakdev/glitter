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

export interface StoreAppearance {
    fontScale: FontScale;
    fontFamily: string;
    radius: RadiusPreset;
    density: Density;
}

export interface StoreConfig {
    brandNameEn: string;
    brandNameKm: string;
    taglineEn: string;
    taglineKm: string;
    themeColor: string;
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
    announcementEnabled: false,
    announcementEn: '',
    announcementKm: '',
    heroTitleEn: 'Sparkle in every shade.',
    heroTitleKm: 'ភ្លឺចែងចាំងគ្រប់ពណ៌។',
    heroSubtitleEn:
        'Discover glitter and beauty essentials, fresh from our Phnom Penh branches.',
    heroSubtitleKm: 'ស្វែងរកផលិតផលសម្ផស្ស និងពន្លឺ ថ្មីៗពីសាខាភ្នំពេញរបស់យើង។',
    heroCtaEn: 'Shop now',
    heroCtaKm: 'ទិញឥឡូវនេះ',
    heroCtaHref: '/products',
    contactPhone: '',
    contactEmail: '',
    contactAddressEn: '',
    contactAddressKm: '',
    facebookUrl: '',
    instagramUrl: '',
    telegramUrl: '',
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

/** CSS values for the appearance presets, applied as variables on the root. */
export function appearanceVars(
    a: StoreConfig['appearance'],
): Record<string, string> {
    const fontSize = { sm: '15px', md: '16px', lg: '18px' }[a.fontScale];
    const radius = {
        none: '0px',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
    }[a.radius];
    const compact = a.density === 'compact';
    return {
        '--ui-radius': radius,
        '--ui-pad': compact ? '0.5rem' : '0.875rem',
        '--ui-gap': compact ? '0.625rem' : '1rem',
        ...(a.fontFamily ? { '--ui-font': a.fontFamily } : {}),
        fontSize,
    };
}
