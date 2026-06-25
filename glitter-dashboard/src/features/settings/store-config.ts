/**
 * The storefront configuration, edited in the dashboard and read by the store.
 * Persisted as a single JSON `app_settings` row (group `storefront`, key
 * `home_config`, isPublic=true). All customer-facing text is bilingual (EN/KM).
 */

export type HomeSectionType =
    | 'new-arrivals'
    | 'categories'
    | 'category-products'
    | 'best-selling';

/** Which storefront page a section is rendered on. */
export type SectionPage = 'home' | 'products';

export interface HomeSection {
    id: string;
    page: SectionPage;
    type: HomeSectionType;
    titleEn: string;
    titleKm: string;
    enabled: boolean;
    /** For `category-products`: which category to pull from. */
    categoryId?: string;
    /** For product grids: how many products to show. */
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
    color: string; // hex
}

export interface StoreLogo {
    id: string;
    name: string;
    url: string; // served image path
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
    /** ISO date (YYYY-MM-DD) or null = no bound. */
    startAt: string | null;
    endAt: string | null;
}

export type FontScale = 'sm' | 'md' | 'lg';
export type RadiusPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type Density = 'compact' | 'comfortable';
export type ProductColumns = '2' | '3' | '4' | '5' | '6';
export type ProductSort = 'newest' | 'price-asc' | 'price-desc';

/** Storefront look & feel — applied via CSS variables on the store root. */
export interface StoreAppearance {
    fontScale: FontScale;
    /** CSS font-family value, or '' to use the store default. */
    fontFamily: string;
    radius: RadiusPreset;
    density: Density;
    /** Product grid columns on wide screens. */
    productColumns: ProductColumns;
    /** Default product sort when none is chosen. */
    productSort: ProductSort;
}

// Each option pairs a Latin font with a Khmer font (EN + KM support); the
// storefront maps the value (key) to the font stack + Google Fonts load.
// `labelKey` is a friendly, translated name (shown in the dashboard selector).
export const FONT_FAMILY_OPTIONS = [
    { value: '', labelKey: 'settings.appearance.font.system' },
    { value: 'sora', labelKey: 'settings.appearance.font.sora' },
    { value: 'roboto', labelKey: 'settings.appearance.font.roboto' },
    { value: 'inter', labelKey: 'settings.appearance.font.inter' },
    { value: 'nunito', labelKey: 'settings.appearance.font.nunito' },
] as const;

export interface StoreDelivery {
    /** Flat delivery fee charged at checkout. */
    fee: number;
    /** Order subtotal at/above which delivery is free (0 = never free). */
    freeOver: number;
}


export interface StoreConfig {
    brandNameEn: string;
    brandNameKm: string;
    /** Saved logos; the active one's url is mirrored to `logoUrl`. */
    logos: StoreLogo[];
    activeLogoId: string;
    /** Active logo image (served path). Falls back to the badge when empty. */
    logoUrl: string;
    taglineEn: string;
    taglineKm: string;

    /** Active theme's colour (kept in sync with the active theme). */
    themeColor: string; // hex, e.g. #ec4899
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

export const STORE_CONFIG_GROUP = 'storefront';
export const STORE_CONFIG_KEY = 'home_config';

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

    announcementEnabled: true,
    announcementEn: 'Free pickup at our Phnom Penh branches — visit us today! ✨',
    announcementKm: 'ទទួលទំនិញដោយឥតគិតថ្លៃនៅសាខាភ្នំពេញ — អញ្ជើញថ្ងៃនេះ! ✨',
    announcements: [
        {
            id: 'default',
            textEn:
                'Free pickup at our Phnom Penh branches — visit us today! ✨',
            textKm: 'ទទួលទំនិញដោយឥតគិតថ្លៃនៅសាខាភ្នំពេញ — អញ្ជើញថ្ងៃនេះ! ✨',
            enabled: true,
            startAt: null,
            endAt: null,
        },
    ],

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

    contacts: [
        { id: 'phone', label: 'Phone', value: '+855 12 345 678' },
        { id: 'email', label: 'Email', value: 'hello@glitter.shop' },
        {
            id: 'address',
            label: 'Address',
            value: 'St. 432, Toul Tompong, Phnom Penh',
        },
    ],
    socials: [
        {
            id: 'facebook',
            name: 'Facebook',
            url: 'https://facebook.com/glittershop',
            iconUrl: '',
        },
    ],
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

/** Merge a parsed config with defaults so new fields always have a value. */
export function mergeStoreConfig(partial: unknown): StoreConfig {
    const p = (partial ?? {}) as Partial<StoreConfig>;

    // Themes: migrate an old single `themeColor` into one theme if needed.
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

    // Contacts / socials: migrate old fixed fields into lists on first run.
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

    // Logos: migrate an old single `logoUrl` into one logo if needed.
    const logos = Array.isArray(p.logos)
        ? p.logos
        : p.logoUrl
          ? [{ id: 'default', name: 'Logo', url: p.logoUrl }]
          : [];
    const activeLogoId = logos.some((l) => l.id === p.activeLogoId)
        ? (p.activeLogoId as string)
        : (logos[0]?.id ?? '');
    const logoUrl = logos.find((l) => l.id === activeLogoId)?.url ?? '';

    // Announcements: migrate the old single announcement into a list.
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
