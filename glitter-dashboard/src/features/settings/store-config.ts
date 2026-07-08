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

/** A stat shown on the About page, e.g. "5" / "Branches". */
export interface AboutStat {
    id: string;
    value: string;
    labelEn: string;
    labelKm: string;
}

/** A highlight/value card on the About page (icon + title + text). */
export interface AboutHighlight {
    id: string;
    icon: string;
    titleEn: string;
    titleKm: string;
    textEn: string;
    textKm: string;
}

export interface Announcement {
    id: string;
    textEn: string;
    textKm: string;
    enabled: boolean;
    /** ISO date (YYYY-MM-DD) or null = no bound. */
    startAt: string | null;
    endAt: string | null;
    /** When set, this announcement mirrors a live promotion (voucher id). */
    voucherId?: string | null;
    /** Background colour (any CSS colour). Falls back to the brand colour. */
    bgColor?: string | null;
    /** When true, shoppers can dismiss the bar (remembered per browser). */
    dismissible?: boolean;
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

/** How the customer pays for a delivery method.
 *  prepay = pay first (QR) · on_pickup = pay on receipt (at store / on delivery)
 *  · either = customer chooses. */
export type PaymentRule = 'prepay' | 'on_pickup' | 'either';

/** Whether a method delivers to an address or is collected at a branch. */
export type DeliveryMethodType = 'delivery' | 'pickup';

/** Payment instrument kind. qr = static QR + proof · on_delivery = cash on
 *  receipt · external = real provider API (wired later). */
export type PaymentOptionType = 'qr' | 'on_delivery' | 'external';

/** A shipping region (admin-configurable). `id` is stable; the rest is editable. */
export interface DeliveryRegion {
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl: string;
}

/** A delivery option (admin-configurable list). */
export interface DeliveryMethod {
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl: string;
    type: DeliveryMethodType;
    /** Which region this method is offered in. */
    regionId: string;
    fee: number;
    /** How the customer pays for this method. */
    payment: PaymentRule;
    enabled: boolean;
}

/** A payment option (admin-configurable list). */
export interface PaymentOption {
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl: string;
    type: PaymentOptionType;
    enabled: boolean;
    /** type 'qr': the static QR image + account shown at checkout. */
    qrImageUrl: string;
    accountName: string;
    note: string;
    /** type 'external': provider id (e.g. 'aba_payway', 'wing'); secrets live
     *  in the API env, never here. */
    provider: string;
}

/** @deprecated legacy single static KHQR config — migrated into `payments`. */
export interface KhqrConfig {
    imageUrl: string;
    accountName: string;
    note: string;
}

export interface StoreDelivery {
    /** Legacy flat fee (kept for back-compat; no longer shown). */
    fee: number;
    /** Legacy free-over threshold (kept for back-compat; no longer shown). */
    freeOver: number;
    /** @deprecated legacy KHQR — migrated into `payments`. */
    khqr: KhqrConfig;
    /** Admin-configurable shipping regions. */
    regions: DeliveryRegion[];
    /** Admin-configurable delivery options. */
    methods: DeliveryMethod[];
    /** Admin-configurable payment options. */
    payments: PaymentOption[];
    /**
     * Minutes an unpaid pay-first (KHQR) online order holds its reserved stock
     * before it auto-cancels and releases the hold. Pay-on-delivery/pickup
     * orders are not auto-cancelled.
     */
    holdMinutes: number;
}

export const DEFAULT_REGIONS: DeliveryRegion[] = [
    { id: 'phnom_penh', nameEn: 'Phnom Penh', nameKm: 'ភ្នំពេញ', iconUrl: '' },
    { id: 'province', nameEn: 'Province', nameKm: 'ខេត្ត', iconUrl: '' },
];

export const DEFAULT_METHODS: DeliveryMethod[] = [
    {
        id: 'cod',
        nameEn: 'Cash on Delivery',
        nameKm: 'បង់ប្រាក់ពេលដឹក',
        iconUrl: '',
        type: 'delivery',
        regionId: 'phnom_penh',
        fee: 1.5,
        payment: 'either',
        enabled: true,
    },
    {
        id: 'grab',
        nameEn: 'Grab Delivery',
        nameKm: 'ដឹកដោយ Grab',
        iconUrl: '',
        type: 'delivery',
        regionId: 'phnom_penh',
        fee: 0,
        payment: 'prepay',
        enabled: true,
    },
    {
        id: 'pickup',
        nameEn: 'Pick Up at Store',
        nameKm: 'ទទួលនៅហាង',
        iconUrl: '',
        type: 'pickup',
        regionId: 'phnom_penh',
        fee: 0,
        payment: 'prepay',
        enabled: true,
    },
    {
        id: 'vet_express',
        nameEn: 'VET Express',
        nameKm: 'VET Express',
        iconUrl: '',
        type: 'delivery',
        regionId: 'province',
        fee: 1.5,
        payment: 'prepay',
        enabled: true,
    },
];

export const DEFAULT_PAYMENTS: PaymentOption[] = [
    {
        id: 'aba_khqr',
        nameEn: 'ABA KHQR',
        nameKm: 'ABA KHQR',
        iconUrl: '',
        type: 'qr',
        enabled: true,
        qrImageUrl: '',
        accountName: '',
        note: '',
        provider: '',
    },
    {
        id: 'cash',
        nameEn: 'Cash on delivery / at store',
        nameKm: 'បង់ប្រាក់ពេលដឹក / នៅហាង',
        iconUrl: '',
        type: 'on_delivery',
        enabled: true,
        qrImageUrl: '',
        accountName: '',
        note: '',
        provider: '',
    },
];

export const DEFAULT_DELIVERY: StoreDelivery = {
    fee: 1.5,
    freeOver: 15,
    khqr: { imageUrl: '', accountName: '', note: '' },
    regions: DEFAULT_REGIONS,
    methods: DEFAULT_METHODS,
    payments: DEFAULT_PAYMENTS,
    holdMinutes: 30,
};

/** Old keyed-object method shape (pre-dynamic). Used only for migration. */
interface LegacyMethod {
    enabled?: boolean;
    fee?: number;
    payment?: PaymentRule;
    regionId?: string;
}

/**
 * Deep-merge saved delivery config onto the defaults, migrating the older
 * shapes: a keyed `methods` object → an array, and the legacy single `khqr`
 * config → a `qr` payment option.
 */
export function mergeDelivery(partial: unknown): StoreDelivery {
    const d = (partial ?? {}) as Partial<StoreDelivery> & {
        methods?: unknown;
        khqr?: KhqrConfig;
    };

    const regions =
        Array.isArray(d.regions) && d.regions.length > 0
            ? d.regions.map((r) => ({ ...r, iconUrl: r.iconUrl ?? '' }))
            : DEFAULT_REGIONS;
    const regionExists = (id: string) => regions.some((r) => r.id === id);

    // --- methods: accept the new array, or migrate the old keyed object ---
    let methods: DeliveryMethod[];
    if (Array.isArray(d.methods)) {
        methods = (d.methods as Partial<DeliveryMethod>[]).map((m, i) => {
            const base = DEFAULT_METHODS[i] ?? DEFAULT_METHODS[0];
            const merged = { ...base, ...m } as DeliveryMethod;
            return {
                ...merged,
                id: m.id ?? base.id,
                regionId: regionExists(merged.regionId)
                    ? merged.regionId
                    : regions[0].id,
            };
        });
    } else if (d.methods && typeof d.methods === 'object') {
        const legacy = d.methods as Record<string, LegacyMethod>;
        methods = DEFAULT_METHODS.map((base) => {
            const saved = legacy[base.id] ?? {};
            const regionId =
                saved.regionId && regionExists(saved.regionId)
                    ? saved.regionId
                    : base.regionId;
            return {
                ...base,
                enabled: saved.enabled ?? base.enabled,
                fee: typeof saved.fee === 'number' ? saved.fee : base.fee,
                payment: saved.payment ?? base.payment,
                regionId,
            };
        });
    } else {
        methods = DEFAULT_METHODS;
    }

    // --- payments: accept the new array, else seed defaults + migrate khqr ---
    let payments: PaymentOption[];
    if (Array.isArray(d.payments) && d.payments.length > 0) {
        payments = (d.payments as Partial<PaymentOption>[]).map((p, i) => ({
            ...(DEFAULT_PAYMENTS[i] ?? DEFAULT_PAYMENTS[0]),
            ...p,
        })) as PaymentOption[];
    } else {
        payments = DEFAULT_PAYMENTS.map((p) => ({ ...p }));
        const legacyKhqr = d.khqr;
        if (legacyKhqr?.imageUrl || legacyKhqr?.accountName) {
            const qr = payments.find((p) => p.type === 'qr');
            if (qr) {
                qr.qrImageUrl = legacyKhqr.imageUrl ?? '';
                qr.accountName = legacyKhqr.accountName ?? '';
                qr.note = legacyKhqr.note ?? '';
            }
        }
    }

    return {
        fee: typeof d.fee === 'number' ? d.fee : DEFAULT_DELIVERY.fee,
        freeOver:
            typeof d.freeOver === 'number'
                ? d.freeOver
                : DEFAULT_DELIVERY.freeOver,
        khqr: { ...DEFAULT_DELIVERY.khqr, ...(d.khqr ?? {}) },
        regions,
        methods,
        payments,
        holdMinutes:
            typeof d.holdMinutes === 'number' && d.holdMinutes > 0
                ? d.holdMinutes
                : DEFAULT_DELIVERY.holdMinutes,
    };
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
    // About page content (all editable from the dashboard).
    aboutHeadlineEn: string;
    aboutHeadlineKm: string;
    aboutStoryEn: string;
    aboutStoryKm: string;
    aboutImageUrl: string;
    aboutStats: AboutStat[];
    aboutHighlights: AboutHighlight[];

    banners: StoreBanner[];
    sections: HomeSection[];
    delivery: StoreDelivery;
    /** Display order of the fixed storefront header nav items (by id). */
    navOrder: string[];
}

/** The fixed storefront nav ids, in their default order (label keys in i18n). */
export const DEFAULT_NAV_ORDER = [
    'home',
    'promotion',
    'product',
    'brand',
    'location',
    'social',
];

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
    aboutHeadlineEn: '',
    aboutHeadlineKm: '',
    aboutStoryEn: '',
    aboutStoryKm: '',
    aboutImageUrl: '',
    aboutStats: [],
    aboutHighlights: [],

    banners: [],
    delivery: DEFAULT_DELIVERY,
    navOrder: DEFAULT_NAV_ORDER,

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
/** Keep only known nav ids, in the saved order, then append any missing. */
function mergeNavOrder(value: unknown): string[] {
    const saved = Array.isArray(value)
        ? value.filter(
              (v): v is string =>
                  typeof v === 'string' && DEFAULT_NAV_ORDER.includes(v),
          )
        : [];
    const ordered = [...new Set(saved)];
    for (const id of DEFAULT_NAV_ORDER) {
        if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
}

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
        delivery: mergeDelivery(p.delivery),
        navOrder: mergeNavOrder(p.navOrder),
        aboutStats: Array.isArray(p.aboutStats) ? p.aboutStats : [],
        aboutHighlights: Array.isArray(p.aboutHighlights)
            ? p.aboutHighlights
            : [],
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
