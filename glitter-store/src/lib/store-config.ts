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

export interface StoreTheme {
    id: string;
    name: string;
    color: string;
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
    themes: StoreTheme[];
    activeThemeId: string;
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
    contacts: ContactField[];
    socials: SocialLink[];
    footerDescriptionEn: string;
    footerDescriptionKm: string;
    banners: StoreBanner[];
    sections: HomeSection[];
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
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
    contacts: [],
    socials: [],
    footerDescriptionEn: '',
    footerDescriptionKm: '',
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

    return {
        ...DEFAULT_STORE_CONFIG,
        ...p,
        themes,
        activeThemeId,
        themeColor,
        contacts,
        socials,
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
