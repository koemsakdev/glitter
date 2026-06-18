import { cookies } from 'next/headers';

export type Lang = 'en' | 'km';

/** Reads the visitor's language from the `lang` cookie (defaults to English). */
export async function getLang(): Promise<Lang> {
    const store = await cookies();
    return store.get('lang')?.value === 'km' ? 'km' : 'en';
}

/** Pick the localized value, falling back to English when Khmer is empty. */
export function pick(lang: Lang, en: string, km: string): string {
    return lang === 'km' ? km || en : en;
}

/** Static UI strings (non-config). */
const DICT: Record<Lang, Record<string, string>> = {
    en: {
        home: 'Home',
        shop: 'Shop',
        search: 'Search products…',
        allProducts: 'All products',
        viewAll: 'View all',
        contact: 'Contact',
        inStock: 'In stock',
        outOfStock: 'Out of stock',
        sale: 'Sale',
        soldOut: 'Sold out',
        addToCart: 'Add to cart',
        checkoutSoon:
            'Online checkout is coming soon — visit our Phnom Penh branches to purchase.',
        availableOptions: 'Available options',
        availableAt: 'Available at',
        description: 'Description',
        details: 'Details',
        noReviews: 'No reviews yet',
        results: 'Results for',
        products: 'products',
        noProducts: 'No products found',
        tryDifferent: 'Try a different search or filter.',
        clearFilters: 'Clear filters',
        categories: 'Categories',
        brands: 'Brands',
        all: 'All',
        newest: 'Newest',
        priceLow: 'Price: low to high',
        priceHigh: 'Price: high to low',
        previous: 'Previous',
        next: 'Next',
        page: 'Page',
        of: 'of',
        inStockCount: 'in stock',
    },
    km: {
        home: 'ទំព័រដើម',
        shop: 'ហាង',
        search: 'ស្វែងរកផលិតផល…',
        allProducts: 'ផលិតផលទាំងអស់',
        viewAll: 'មើលទាំងអស់',
        contact: 'ទំនាក់ទំនង',
        inStock: 'មានស្តុក',
        outOfStock: 'អស់ស្តុក',
        sale: 'បញ្ចុះតម្លៃ',
        soldOut: 'អស់ស្តុក',
        addToCart: 'ដាក់ចូលកន្ត្រក',
        checkoutSoon:
            'ការទិញតាមអនឡាញនឹងមកដល់ឆាប់ៗ — អញ្ជើញមកសាខាភ្នំពេញដើម្បីទិញ។',
        availableOptions: 'ជម្រើសដែលមាន',
        availableAt: 'មាននៅ',
        description: 'ការពិពណ៌នា',
        details: 'ព័ត៌មានលម្អិត',
        noReviews: 'មិនទាន់មានការវាយតម្លៃ',
        results: 'លទ្ធផលសម្រាប់',
        products: 'ផលិតផល',
        noProducts: 'រកមិនឃើញផលិតផល',
        tryDifferent: 'សាកល្បងការស្វែងរក ឬតម្រងផ្សេង។',
        clearFilters: 'សម្អាតតម្រង',
        categories: 'ប្រភេទ',
        brands: 'ម៉ាក',
        all: 'ទាំងអស់',
        newest: 'ថ្មីបំផុត',
        priceLow: 'តម្លៃ៖ ទាបទៅខ្ពស់',
        priceHigh: 'តម្លៃ៖ ខ្ពស់ទៅទាប',
        previous: 'មុន',
        next: 'បន្ទាប់',
        page: 'ទំព័រ',
        of: 'នៃ',
        inStockCount: 'ក្នុងស្តុក',
    },
};

export function tr(lang: Lang, key: string): string {
    return DICT[lang][key] ?? DICT.en[key] ?? key;
}
