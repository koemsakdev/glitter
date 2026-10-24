import { format, isValid, parseISO } from 'date-fns';
import type { TrailEntry } from '@/features/audit/audit-api';

/**
 * Turns raw database changes into something a person can read:
 * friendly field names, names instead of IDs, formatted values, and no
 * internal bookkeeping fields.
 */

type Lang = 'en' | 'km';

/** Internal fields nobody needs to see in an audit trail. */
const HIDDEN = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'passwordHash',
    'tokenVersion',
    'emailOtpHash',
    'emailOtpCode',
    'emailOtpSentAt',
    'emailOtpExpiresAt',
    'emailOtpAttempts',
    'isProfileComplete',
    'profileImageSource',
    'missingFields',
    'linkedProviders',
    'authAccounts',
    'searchVector',
    'stockHeld',
    'clearLogo',
    'clearIcon',
    'clearImage',
]);

/** Fields that point at another record (the API sends their names). */
const REF_FIELDS = new Set([
    'branchId',
    'fromBranchId',
    'toBranchId',
    'categoryId',
    'parentCategoryId',
    'parentId',
    'brandId',
    'productId',
    'relatedProductId',
    'productVariantId',
    'variantId',
    'userId',
    'customerId',
    'cashierId',
    'colorId',
    'badgeId',
    'voucherId',
    'orderId',
]);

const LABELS: Record<string, [string, string]> = {
    fullName: ['Full name', 'ឈ្មោះពេញ'],
    username: ['Username', 'ឈ្មោះអ្នកប្រើ'],
    email: ['Email', 'អ៊ីមែល'],
    phoneNumber: ['Phone', 'លេខទូរស័ព្ទ'],
    role: ['Role', 'តួនាទី'],
    branchId: ['Branch', 'សាខា'],
    fromBranchId: ['From branch', 'ពីសាខា'],
    toBranchId: ['To branch', 'ទៅសាខា'],
    accountStatus: ['Account status', 'ស្ថានភាពគណនី'],
    emailVerifiedAt: ['Email verified on', 'បានផ្ទៀងផ្ទាត់អ៊ីមែល'],
    phoneVerifiedAt: ['Phone verified on', 'បានផ្ទៀងផ្ទាត់ទូរស័ព្ទ'],
    profileImageUrl: ['Profile photo', 'រូបភាពប្រវត្តិរូប'],
    lastPasswordChangedAt: [
        'Password last changed',
        'ប្តូរពាក្យសម្ងាត់ចុងក្រោយ',
    ],
    password: ['Password', 'ពាក្យសម្ងាត់'],
    nameEn: ['Name (English)', 'ឈ្មោះ (អង់គ្លេស)'],
    nameKm: ['Name (Khmer)', 'ឈ្មោះ (ខ្មែរ)'],
    name: ['Name', 'ឈ្មោះ'],
    descriptionEn: ['Description (English)', 'ការពិពណ៌នា (អង់គ្លេស)'],
    descriptionKm: ['Description (Khmer)', 'ការពិពណ៌នា (ខ្មែរ)'],
    slug: ['Web address', 'អាសយដ្ឋានវេប'],
    sku: ['SKU', 'SKU'],
    variantSku: ['Variant SKU', 'SKU វ៉ារ្យ៉ង់'],
    price: ['Price', 'តម្លៃ'],
    originalPrice: ['Original price', 'តម្លៃដើម'],
    costPrice: ['Cost price', 'តម្លៃទិញ'],
    priceOverride: ['Variant price', 'តម្លៃវ៉ារ្យ៉ង់'],
    status: ['Status', 'ស្ថានភាព'],
    paymentStatus: ['Payment status', 'ស្ថានភាពទូទាត់'],
    productType: ['Product type', 'ប្រភេទផលិតផល'],
    categoryId: ['Category', 'ប្រភេទ'],
    brandId: ['Brand', 'ម៉ាក'],
    productId: ['Product', 'ផលិតផល'],
    productVariantId: ['Variant', 'វ៉ារ្យ៉ង់'],
    totalStock: ['Total stock', 'ស្តុកសរុប'],
    quantityAvailable: ['Available stock', 'ស្តុកដែលមាន'],
    quantityReserved: ['Reserved', 'បានកក់'],
    quantityDamaged: ['Damaged', 'ខូច'],
    quantityInStock: ['In stock', 'ក្នុងស្តុក'],
    quantity: ['Quantity', 'ចំនួន'],
    operation: ['Operation', 'ប្រតិបត្តិការ'],
    size: ['Size', 'ទំហំ'],
    color: ['Color', 'ពណ៌'],
    colorHex: ['Color', 'ពណ៌'],
    branchNameEn: ['Branch name (English)', 'ឈ្មោះសាខា (អង់គ្លេស)'],
    branchNameKm: ['Branch name (Khmer)', 'ឈ្មោះសាខា (ខ្មែរ)'],
    branchCode: ['Branch code', 'លេខកូដសាខា'],
    branchStatus: ['Branch status', 'ស្ថានភាពសាខា'],
    streetAddress: ['Address', 'អាសយដ្ឋាន'],
    city: ['City', 'ទីក្រុង'],
    openingHours: ['Opening hours', 'ម៉ោងបើក'],
    latitude: ['Latitude', 'រយៈទទឹង'],
    longitude: ['Longitude', 'រយៈបណ្តោយ'],
    logoUrl: ['Logo', 'ឡូហ្គោ'],
    iconUrl: ['Icon', 'រូបតំណាង'],
    imageUrl: ['Image', 'រូបភាព'],
    imageUrls: ['Images', 'រូបភាព'],
    websiteUrl: ['Website', 'គេហទំព័រ'],
    displayOrder: ['Display order', 'លំដាប់បង្ហាញ'],
    categoryType: ['Category type', 'ប្រភេទ'],
    titleEn: ['Title (English)', 'ចំណងជើង (អង់គ្លេស)'],
    titleKm: ['Title (Khmer)', 'ចំណងជើង (ខ្មែរ)'],
    commentEn: ['Comment', 'មតិ'],
    rating: ['Rating', 'ការវាយតម្លៃ'],
    reviewerName: ['Reviewer', 'អ្នកវាយតម្លៃ'],
    code: ['Code', 'លេខកូដ'],
    discountType: ['Discount type', 'ប្រភេទបញ្ចុះតម្លៃ'],
    discountValue: ['Discount', 'បញ្ចុះតម្លៃ'],
    minOrderAmount: ['Minimum order', 'ការបញ្ជាទិញអប្បបរមា'],
    usageLimit: ['Usage limit', 'ដែនកំណត់ប្រើ'],
    startsAt: ['Starts', 'ចាប់ផ្តើម'],
    endsAt: ['Ends', 'បញ្ចប់'],
    isActive: ['Active', 'សកម្ម'],
    note: ['Note', 'កំណត់ចំណាំ'],
    trackingNumber: ['Tracking number', 'លេខតាមដាន'],
    carrier: ['Courier', 'អ្នកដឹកជញ្ជូន'],
};

const ROLE: Record<string, [string, string]> = {
    admin: ['Admin', 'អ្នកគ្រប់គ្រង'],
    manager: ['Manager', 'អ្នកចាត់ការ'],
    cashier: ['Cashier', 'អ្នកគិតលុយ'],
    customer: ['Customer', 'អតិថិជន'],
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const MONEY = /(price|cost|total|amount|subtotal|shipping)/i;
const NOT_MONEY = /(count|qty|quantity|stock|limit)/i;
const IMAGE = /(url|urls)$/i;

/** "phoneVerifiedAt" → "Phone verified at", "nameEn" → "Name (English)". */
function humanize(key: string, lang: Lang): string {
    let k = key;
    let suffix = '';
    if (/En$/.test(k)) {
        k = k.slice(0, -2);
        suffix = lang === 'km' ? ' (អង់គ្លេស)' : ' (English)';
    } else if (/Km$/.test(k)) {
        k = k.slice(0, -2);
        suffix = lang === 'km' ? ' (ខ្មែរ)' : ' (Khmer)';
    }
    k = k.replace(/Id$/, '').replace(/Url$/, '');
    const words = k
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1) + suffix;
}

export function fieldLabel(key: string, lang: Lang): string {
    const l = LABELS[key];
    return l ? l[lang === 'km' ? 1 : 0] : humanize(key, lang);
}

export function isVisibleField(key: string): boolean {
    return !HIDDEN.has(key);
}

const empty = (v: unknown) =>
    v === null ||
    v === undefined ||
    v === '' ||
    (Array.isArray(v) && v.length === 0);

export interface ReadableValue {
    text: string;
    /** Image to preview instead of a URL. */
    image?: string;
    /** Color swatch (hex). */
    swatch?: string;
}

/** A field's value as people would say it. */
export function readableValue(
    key: string,
    value: unknown,
    refs: Record<string, string>,
    lang: Lang,
): ReadableValue {
    const yes = lang === 'km' ? 'បាទ/ចាស' : 'Yes';
    const no = lang === 'km' ? 'ទេ' : 'No';
    if (empty(value)) return { text: '—' };
    if (key === 'password' || (/password/i.test(key) && value === '***')) {
        return { text: lang === 'km' ? 'បានប្តូរ' : 'Changed' };
    }
    if (typeof value === 'boolean') return { text: value ? yes : no };

    // A reference to another record → its name.
    if (
        REF_FIELDS.has(key) ||
        (typeof value === 'string' && UUID.test(value))
    ) {
        const ids = Array.isArray(value) ? value : [value];
        return {
            text: ids
                .map((id) =>
                    typeof id === 'string'
                        ? (refs[id] ??
                          (lang === 'km'
                              ? 'ទិន្នន័យដែលបានលុប'
                              : 'Removed record'))
                        : String(id),
                )
                .join(', '),
        };
    }

    if (key === 'role' && typeof value === 'string' && ROLE[value]) {
        return { text: ROLE[value][lang === 'km' ? 1 : 0] };
    }
    if (key === 'colorHex' && typeof value === 'string') {
        return { text: value.toUpperCase(), swatch: value };
    }
    if (key === 'rating' && typeof value === 'number') {
        return {
            text: `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 5 - value))}`,
        };
    }
    if (
        IMAGE.test(key) &&
        typeof value === 'string' &&
        (value.startsWith('/upload') || value.startsWith('http'))
    ) {
        return { text: value.split('/').pop() ?? value, image: value };
    }
    if (Array.isArray(value)) {
        return {
            text: value
                .map((v) => readableValue(key, v, refs, lang).text)
                .join(', '),
        };
    }
    if (typeof value === 'string' && ISO_DATE.test(value)) {
        const d = parseISO(value);
        if (isValid(d)) return { text: format(d, 'dd MMM yyyy, HH:mm') };
    }
    const n = typeof value === 'number' ? value : Number(value);
    if (
        MONEY.test(key) &&
        !NOT_MONEY.test(key) &&
        value !== '' &&
        Number.isFinite(n)
    ) {
        return { text: `$${n.toFixed(2)}` };
    }
    if (typeof value === 'object') {
        return {
            text: Object.entries(value as Record<string, unknown>)
                .filter(([, v]) => !empty(v))
                .map(
                    ([k, v]) =>
                        `${fieldLabel(k, lang)}: ${readableValue(k, v, refs, lang).text}`,
                )
                .join(' · '),
        };
    }
    // Enum-like values: "out_of_stock" → "Out of stock".
    if (typeof value === 'string' && /^[a-z]+(_[a-z]+)*$/.test(value)) {
        const words = value.replace(/_/g, ' ');
        return { text: words.charAt(0).toUpperCase() + words.slice(1) };
    }
    return { text: String(value) };
}

export interface ReadableChange {
    key: string;
    label: string;
    before: ReadableValue | null;
    after: ReadableValue;
}

/**
 * The fields a person should see for one trail entry. For a create, empty
 * fields are skipped (nothing was set); for an update, every changed field.
 */
export function readableChanges(
    e: TrailEntry,
    refs: Record<string, string>,
    lang: Lang,
): ReadableChange[] {
    const oldV = e.changes?.old_value ?? {};
    const newV = e.changes?.new_value ?? {};
    const isCreate = !e.changes?.old_value && !!e.changes?.new_value;
    const keys = Array.from(
        new Set([...Object.keys(oldV), ...Object.keys(newV)]),
    )
        .filter(isVisibleField)
        .filter((k) => !(isCreate && empty(newV[k])));
    return keys.map((k) => ({
        key: k,
        label: fieldLabel(k, lang),
        before: isCreate ? null : readableValue(k, oldV[k], refs, lang),
        after: readableValue(k, newV[k], refs, lang),
    }));
}
