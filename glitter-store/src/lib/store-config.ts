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
    startAt: string | null;
    endAt: string | null;
    /** When set, this announcement mirrors a live promotion (id). */
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

export interface StoreAppearance {
    fontScale: FontScale;
    fontFamily: string;
    radius: RadiusPreset;
    density: Density;
    productColumns: ProductColumns;
    productSort: ProductSort;
}

/** prepay = pay first (QR) · on_pickup = pay on receipt · either = customer chooses. */
export type PaymentRule = 'prepay' | 'on_pickup' | 'either';

/** Whether a method delivers to an address or is collected at a branch. */
export type DeliveryMethodType = 'delivery' | 'pickup';

/** aba_khqr = ABA KHQR (QR + ABA Mobile deeplink) · aba_ecommerce = ABA hosted
 *  eCommerce checkout · cod = pay on delivery / at pickup. */
export type PaymentOptionType = 'aba_khqr' | 'aba_ecommerce' | 'cod';

/** Payment option types that pay online via ABA PayWay. */
export const ABA_PAYMENT_TYPES: PaymentOptionType[] = [
    'aba_khqr',
    'aba_ecommerce',
];

/** A payment option (admin-configurable list). ABA credentials live privately
 *  in the ABA PayWay config, never here. */
export interface PaymentOption {
    id: string;
    nameEn: string;
    nameKm: string;
    descEn: string;
    descKm: string;
    iconUrl: string;
    /** Accent/border colour (hex) for the checkout card. */
    color: string;
    type: PaymentOptionType;
    enabled: boolean;
}

/** A shipping region (admin-configurable). */
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
    regionId: string;
    fee: number;
    payment: PaymentRule;
    enabled: boolean;
}

export interface StoreDelivery {
    /** Flat delivery fee fallback. */
    fee: number;
    /** Orders at/above this subtotal ship free (0 = never). */
    freeOver: number;
    regions: DeliveryRegion[];
    methods: DeliveryMethod[];
    /** Admin-configurable payment options shown at checkout. */
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
        payment: 'on_pickup',
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
        descEn: 'Scan with any banking app',
        descKm: 'ស្កេនដោយកម្មវិធីធនាគារណាមួយ',
        iconUrl: '',
        color: '#015f7a',
        type: 'aba_khqr',
        enabled: true,
    },
    {
        id: 'aba_ecommerce',
        nameEn: 'ABA KHQR E-Commerce',
        nameKm: 'ABA KHQR E-Commerce',
        descEn: 'Card, ABA Pay, KHQR & wallets',
        descKm: 'កាត ABA Pay KHQR និងកាបូបអេឡិចត្រូនិច',
        iconUrl: '',
        color: '#0ea5e9',
        type: 'aba_ecommerce',
        enabled: false,
    },
    {
        id: 'cod',
        nameEn: 'Cash on Delivery',
        nameKm: 'បង់ប្រាក់ពេលដឹក',
        descEn: 'Pay when you receive your order',
        descKm: 'បង់ប្រាក់ពេលទទួលទំនិញ',
        iconUrl: '',
        color: '#16a34a',
        type: 'cod',
        enabled: true,
    },
];

export interface StoreConfig {
    brandNameEn: string;
    brandNameKm: string;
    logos: StoreLogo[];
    activeLogoId: string;
    logoUrl: string;
    /** Logo corner rounding across the store, as a percent (0 = square, 50 = circle). */
    logoRadius: number;
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
    /** Display order of the fixed header nav items (by id). @deprecated navItems */
    navOrder: string[];
    /** Header nav config: order + per-item label/icon override + enabled. */
    navItems: StoreNavItem[];
}

/** The fixed storefront nav ids, in their default order. */
export const DEFAULT_NAV_ORDER = [
    'home',
    'promotion',
    'product',
    'brand',
    'location',
    'social',
];

/** A configurable header nav item. Empty `labelEn`/`labelKm`/`icon` means fall
 *  back to the built-in default for that id (see nav-config). `id` maps to the
 *  fixed destination (href). */
export interface StoreNavItem {
    id: string;
    labelEn: string;
    labelKm: string;
    icon: string;
    enabled: boolean;
}

/** Built-in defaults per nav id (label + icon name). These seed each item so
 *  the config always carries an explicit value the storefront reads directly —
 *  no "blank means fall back" guesswork. */
export const NAV_DEFAULTS: Record<
    string,
    { labelEn: string; labelKm: string; icon: string }
> = {
    home: { labelEn: 'Home', labelKm: 'ទំព័រដើម', icon: 'home' },
    promotion: {
        labelEn: 'Promotion',
        labelKm: 'ការផ្សព្វផ្សាយ',
        icon: 'badge-percent',
    },
    product: { labelEn: 'Product', labelKm: 'ផលិតផល', icon: 'shopping-bag' },
    brand: { labelEn: 'Brand', labelKm: 'ម៉ាកយីហោ', icon: 'gem' },
    location: { labelEn: 'Location', labelKm: 'ទីតាំង', icon: 'map-pin' },
    social: { labelEn: 'Social Media', labelKm: 'បណ្តាញសង្គម', icon: 'share' },
};

export const DEFAULT_NAV_ITEMS: StoreNavItem[] = DEFAULT_NAV_ORDER.map((id) => ({
    id,
    ...NAV_DEFAULTS[id],
    enabled: true,
}));

export const DEFAULT_STORE_CONFIG: StoreConfig = {
    logos: [],
    activeLogoId: '',
    logoUrl: '',
    logoRadius: 50,
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
    navOrder: DEFAULT_NAV_ORDER,
    navItems: DEFAULT_NAV_ITEMS,
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
    aboutHeadlineEn: '',
    aboutHeadlineKm: '',
    aboutStoryEn: '',
    aboutStoryKm: '',
    aboutImageUrl: '',
    aboutStats: [],
    aboutHighlights: [],
    banners: [],
    delivery: {
        fee: 1.5,
        freeOver: 15,
        regions: DEFAULT_REGIONS,
        methods: DEFAULT_METHODS,
        payments: DEFAULT_PAYMENTS,
        holdMinutes: 30,
    },
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

/** Old keyed-object method shape (pre-dynamic). Used only for migration. */
interface LegacyMethod {
    enabled?: boolean;
    fee?: number;
    payment?: PaymentRule;
    regionId?: string;
}

/**
 * Deep-merge the delivery config, migrating older shapes: a keyed `methods`
 * object → an array, and the legacy single `khqr` → a `qr` payment option.
 */
function mergeDelivery(partial: unknown): StoreDelivery {
    const base = DEFAULT_STORE_CONFIG.delivery;
    const d = (partial ?? {}) as Partial<StoreDelivery> & {
        methods?: unknown;
    };

    const regions =
        Array.isArray(d.regions) && d.regions.length > 0
            ? d.regions.map((r) => ({ ...r, iconUrl: r.iconUrl ?? '' }))
            : DEFAULT_REGIONS;
    const regionExists = (id: string) => regions.some((r) => r.id === id);

    let methods: DeliveryMethod[];
    if (Array.isArray(d.methods)) {
        methods = (d.methods as Partial<DeliveryMethod>[]).map((m, i) => {
            const def = DEFAULT_METHODS[i] ?? DEFAULT_METHODS[0];
            const merged = { ...def, ...m } as DeliveryMethod;
            return {
                ...merged,
                id: m.id ?? def.id,
                regionId: regionExists(merged.regionId)
                    ? merged.regionId
                    : regions[0].id,
            };
        });
    } else if (d.methods && typeof d.methods === 'object') {
        const legacy = d.methods as Record<string, LegacyMethod>;
        methods = DEFAULT_METHODS.map((def) => {
            const saved = legacy[def.id] ?? {};
            return {
                ...def,
                enabled: saved.enabled ?? def.enabled,
                fee: typeof saved.fee === 'number' ? saved.fee : def.fee,
                payment: saved.payment ?? def.payment,
                regionId:
                    saved.regionId && regionExists(saved.regionId)
                        ? saved.regionId
                        : def.regionId,
            };
        });
    } else {
        methods = DEFAULT_METHODS;
    }

    const normalizePayType = (ty: unknown): PaymentOptionType =>
        ty === 'cod' || ty === 'cash' || ty === 'on_delivery'
            ? 'cod'
            : ty === 'aba_ecommerce'
              ? 'aba_ecommerce'
              : 'aba_khqr';
    // Default each option from its OWN (normalised) type, so new fields fall
    // back to the right values regardless of position in the saved array.
    const defByType = (ty: PaymentOptionType): PaymentOption =>
        DEFAULT_PAYMENTS.find((dp) => dp.type === ty) ?? DEFAULT_PAYMENTS[0];
    const payments: PaymentOption[] =
        Array.isArray(d.payments) && d.payments.length > 0
            ? (d.payments as Partial<PaymentOption>[]).map((p) => {
                  const type = normalizePayType(p.type);
                  const def = defByType(type);
                  return {
                      id: p.id ?? def.id,
                      nameEn: p.nameEn ?? def.nameEn,
                      nameKm: p.nameKm ?? def.nameKm,
                      descEn: p.descEn ?? def.descEn,
                      descKm: p.descKm ?? def.descKm,
                      iconUrl: p.iconUrl ?? '',
                      color: p.color || def.color,
                      type,
                      enabled: p.enabled ?? def.enabled,
                  };
              })
            : DEFAULT_PAYMENTS.map((p) => ({ ...p }));

    return {
        fee: typeof d.fee === 'number' ? d.fee : base.fee,
        freeOver: typeof d.freeOver === 'number' ? d.freeOver : base.freeOver,
        regions,
        methods,
        payments,
        holdMinutes:
            typeof d.holdMinutes === 'number' && d.holdMinutes > 0
                ? d.holdMinutes
                : base.holdMinutes,
    };
}

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

/** Merge saved nav items with the fixed defaults: keep known ids in the saved
 *  order (with their overrides), migrate from the legacy `navOrder`, then append
 *  any ids that weren't stored. */
function mergeNavItems(saved: unknown, legacyOrder: unknown): StoreNavItem[] {
    const known = new Set(DEFAULT_NAV_ORDER);
    const out: StoreNavItem[] = [];
    const seen = new Set<string>();

    const push = (o: Record<string, unknown>) => {
        const id = typeof o.id === 'string' ? o.id : '';
        if (!known.has(id) || seen.has(id)) return;
        seen.add(id);
        const d = NAV_DEFAULTS[id];
        out.push({
            id,
            labelEn: (typeof o.labelEn === 'string' && o.labelEn) || d.labelEn,
            labelKm: (typeof o.labelKm === 'string' && o.labelKm) || d.labelKm,
            icon: (typeof o.icon === 'string' && o.icon) || d.icon,
            enabled: o.enabled !== false,
        });
    };

    if (Array.isArray(saved) && saved.length) {
        for (const it of saved) {
            if (it && typeof it === 'object')
                push(it as Record<string, unknown>);
        }
    } else if (Array.isArray(legacyOrder)) {
        for (const id of legacyOrder) if (typeof id === 'string') push({ id });
    }

    for (const id of DEFAULT_NAV_ORDER) {
        if (!seen.has(id)) out.push({ id, ...NAV_DEFAULTS[id], enabled: true });
    }
    return out;
}

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
    const logoRadius =
        typeof p.logoRadius === 'number'
            ? Math.max(0, Math.min(50, p.logoRadius))
            : DEFAULT_STORE_CONFIG.logoRadius;

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
        logoRadius,
        contacts,
        socials,
        announcements,
        appearance: {
            ...DEFAULT_STORE_CONFIG.appearance,
            ...(p.appearance ?? {}),
        },
        delivery: mergeDelivery(p.delivery),
        navOrder: mergeNavOrder(p.navOrder),
        navItems: mergeNavItems(
            p.navItems,
            (p as { navOrder?: unknown }).navOrder,
        ),
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
