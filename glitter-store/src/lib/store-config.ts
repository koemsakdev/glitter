export type HomeSectionType =
    | 'new-arrivals'
    | 'categories'
    | 'category-products'
    | 'best-selling';

export type SectionPage = 'home' | 'products';

export interface HomeSection {
    id: string;
    page: SectionPage;
    type: HomeSectionType;
    titleEn: string;
    titleKm: string;
    enabled: boolean;
    categoryId?: string;
    limit?: number;
}

export interface StoreBanner {
    id: string;
    imageUrl: string;
    titleEn: string;
    titleKm: string;
    href: string;
    enabled: boolean;
}

export interface StoreTheme {
    id: string;
    name: string;
    color: string;
}

export interface StoreLogo {
    id: string;
    name: string;
    url: string;
}

export interface ContactField {
    id: string;
    label: string;
    value: string;
}

export interface SocialLink {
    id: string;
    name: string;
    url: string;
    iconUrl: string;
}

export interface Announcement {
    id: string;
    textEn: string;
    textKm: string;
    enabled: boolean;
    startAt: string | null;
    endAt: string | null;
}

export type FontScale = 'sm' | 'md' | 'lg';
export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type Density = 'compact' | 'comfortable';
export type ProductColumns = '2' | '3' | '4' | '5' | '6';
export type ProductSort = 'newest' | 'price-asc' | 'price-desc';

export interface StoreAppearance {
    fontScale: FontScale;
    fontFamily: string;
    radius: RadiusPreset;
    density: Density;
    productColumns: ProductColumns;
    productSort: ProductSort;
}

export interface StoreDelivery {
    /** Flat delivery fee charged at checkout. */
    fee: number;
    /** Order subtotal at/above which delivery is free (0 = never free). */
    freeOver: number;
}

export interface StoreConfig {
    brandNameEn: string;
    brandNameKm: string;
    logos: StoreLogo[];
    activeLogoId: string;
    logoUrl: string;
    taglineEn: string;
    taglineKm: string;
    themeColor: string;
    themes: StoreTheme[];
    activeThemeId: string;
    appearance: StoreAppearance;
    announcementEnabled: boolean;
    announcementEn: string;
    announcementKm: string;
    announcements: Announcement[];
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
    contacts: ContactField[];
    socials: SocialLink[];
    footerDescriptionEn: string;
    footerDescriptionKm: string;
    banners: StoreBanner[];
    sections: HomeSection[];
    delivery: StoreDelivery;
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
    logos: [],
    activeLogoId: '',
    logoUrl: '',
    brandNameEn: 'Glitter',
    brandNameKm: 'Glitter',
    taglineEn: 'Beauty & glitter, Phnom Penh.',
    taglineKm: 'សម្ផស្ស និងពន្លឺ ភ្នំពេញ។',
    themeColor: '#ec4899',
    themes: [{ id: 'default', name: 'Pink', color: '#ec4899' }],
    activeThemeId: 'default',
    appearance: {
        fontScale: 'md',
        fontFamily: '',
        radius: 'lg',
        density: 'comfortable',
        productColumns: '4',
        productSort: 'newest',
    },
    announcementEnabled: false,
    announcementEn: '',
    announcementKm: '',
    announcements: [],
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
    contacts: [],
    socials: [],
    footerDescriptionEn: '',
    footerDescriptionKm: '',
    banners: [],
    delivery: { fee: 1.5, freeOver: 15 },
    sections: [
        {
            id: 'categories',
            page: 'home',
            type: 'categories',
            titleEn: 'Shop by category',
            titleKm: 'ទិញតាមប្រភេទ',
            enabled: true,
        },
        {
            id: 'new-arrivals',
            page: 'home',
            type: 'new-arrivals',
            titleEn: 'New arrivals',
            titleKm: 'ទំនិញថ្មី',
            enabled: true,
            limit: 8,
        },
    ],
};

export function mergeStoreConfig(partial: unknown): StoreConfig {
    const p = (partial ?? {}) as Partial<StoreConfig>;

    const themes =
        Array.isArray(p.themes) && p.themes.length > 0
            ? p.themes
            : [
                  {
                      id: 'default',
                      name: 'Default',
                      color: p.themeColor ?? DEFAULT_STORE_CONFIG.themeColor,
                  },
              ];
    const activeThemeId = themes.some((t) => t.id === p.activeThemeId)
        ? (p.activeThemeId as string)
        : themes[0].id;
    const themeColor =
        themes.find((t) => t.id === activeThemeId)?.color ??
        DEFAULT_STORE_CONFIG.themeColor;

    const contacts = Array.isArray(p.contacts)
        ? p.contacts
        : [
              p.contactPhone && {
                  id: 'phone',
                  label: 'Phone',
                  value: p.contactPhone,
              },
              p.contactEmail && {
                  id: 'email',
                  label: 'Email',
                  value: p.contactEmail,
              },
              p.contactAddressEn && {
                  id: 'address',
                  label: 'Address',
                  value: p.contactAddressEn,
              },
          ].filter(Boolean as unknown as (x: unknown) => x is ContactField);
    const socials = Array.isArray(p.socials)
        ? p.socials
        : [
              p.facebookUrl && {
                  id: 'facebook',
                  name: 'Facebook',
                  url: p.facebookUrl,
                  iconUrl: '',
              },
              p.instagramUrl && {
                  id: 'instagram',
                  name: 'Instagram',
                  url: p.instagramUrl,
                  iconUrl: '',
              },
              p.telegramUrl && {
                  id: 'telegram',
                  name: 'Telegram',
                  url: p.telegramUrl,
                  iconUrl: '',
              },
          ].filter(Boolean as unknown as (x: unknown) => x is SocialLink);

    const logos = Array.isArray(p.logos)
        ? p.logos
        : p.logoUrl
          ? [{ id: 'default', name: 'Logo', url: p.logoUrl }]
          : [];
    const activeLogoId = logos.some((l) => l.id === p.activeLogoId)
        ? (p.activeLogoId as string)
        : (logos[0]?.id ?? '');
    const logoUrl = logos.find((l) => l.id === activeLogoId)?.url ?? '';

    const announcements = Array.isArray(p.announcements)
        ? p.announcements
        : p.announcementEn || p.announcementKm
          ? [
                {
                    id: 'default',
                    textEn: p.announcementEn ?? '',
                    textKm: p.announcementKm ?? '',
                    enabled: p.announcementEnabled ?? false,
                    startAt: null,
                    endAt: null,
                },
            ]
          : [];

    return {
        ...DEFAULT_STORE_CONFIG,
        ...p,
        themes,
        activeThemeId,
        themeColor,
        logos,
        activeLogoId,
        logoUrl,
        contacts,
        socials,
        announcements,
        appearance: {
            ...DEFAULT_STORE_CONFIG.appearance,
            ...(p.appearance ?? {}),
        },
        delivery: {
            ...DEFAULT_STORE_CONFIG.delivery,
            ...(p.delivery ?? {}),
        },
        banners: Array.isArray(p.banners) ? p.banners : [],
        sections:
            Array.isArray(p.sections) && p.sections.length > 0
                ? (
                      p.sections as Array<
                          Omit<HomeSection, 'page'> & { page?: SectionPage }
                      >
                  ).map((s) => ({ ...s, page: s.page ?? 'home' }))
                : DEFAULT_STORE_CONFIG.sections,
    };
}

/**
 * Font options. Each pairs a Latin font with a Khmer font (so EN + KM both
 * render well). `href` loads the pair from Google Fonts; `stack` is the CSS
 * font-family (with Google Sans as a final fallback). Key '' = System default.
 */
export const FONT_OPTIONS: Record<
    string,
    { stack: string; href: string }
> = {
    '': { stack: '', href: '' },
    sora: {
        stack: "'Sora', 'Siemreap', var(--font-google-sans), sans-serif",
        href: 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Siemreap&display=swap',
    },
    roboto: {
        stack: "'Roboto', 'Hanuman', var(--font-google-sans), sans-serif",
        href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Hanuman:wght@400;700&display=swap',
    },
    inter: {
        stack: "'Inter', 'Battambang', var(--font-google-sans), sans-serif",
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Battambang:wght@400;700&display=swap',
    },
    nunito: {
        stack: "'Nunito', 'Suwannaphum', var(--font-google-sans), sans-serif",
        href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Suwannaphum:wght@400;700&display=swap',
    },
};

export function resolveFont(key: string): { stack: string; href: string } {
    return FONT_OPTIONS[key] ?? FONT_OPTIONS[''];
}

/**
 * Tailwind grid classes for the configured product-column count. Progressive
 * so the choice is visible across screen sizes (and the higher counts actually
 * differ). Classes are written out literally so Tailwind detects them.
 */
export function productGridClass(columns: ProductColumns): string {
    return {
        '2': 'grid-cols-2',
        '3': 'grid-cols-2 sm:grid-cols-3',
        '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        '5': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        '6': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    }[columns];
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
    const fontStack = resolveFont(a.fontFamily).stack;
    return {
        '--ui-radius': radius,
        '--ui-pad': compact ? '0.5rem' : '0.875rem',
        '--ui-gap': compact ? '0.625rem' : '1rem',
        ...(fontStack ? { '--ui-font': fontStack } : {}),
        fontSize,
    };
}
