/**
 * Lightweight i18n system. Just a Zustand store + a translations dictionary.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'km';

const translations = {
    en: {
        // Login
        'login.title': 'Glitter Shop',
        'login.subtitle': 'Sign in to access the dashboard',
        'login.email': 'Email',
        'login.email.placeholder': 'admin@glittershop.com',
        'login.email.invalid': 'Please enter a valid email',
        'login.password': 'Password',
        'login.password.placeholder': 'Enter your password',
        'login.password.required': 'Password is required',
        'login.password.show': 'Show password',
        'login.password.hide': 'Hide password',
        'login.submit': 'Sign In',
        'login.welcome': 'Welcome back',
        'login.staffOnly': 'This dashboard is for staff only',

        // Toggles
        'theme.toggle': 'Toggle theme',
        'language.toggle': 'Change language',
        'language.english': 'English',
        'language.khmer': 'ភាសាខ្មែរ',

        // Sidebar groups
        'nav.dashboard': 'Dashboard',
        'nav.group.catalog': 'Catalog',
        'nav.group.operations': 'Operations',
        'nav.group.settings': 'Settings',
        'nav.products': 'Products',
        'nav.categories': 'Categories',
        'nav.brands': 'Brands',
        'nav.productImages': 'Product Images',
        'nav.productVariants': 'Variants',
        'nav.productBadges': 'Badges',
        'nav.branches': 'Branches',
        'nav.inventory': 'Inventory',
        'nav.staff': 'Staff',
        'nav.users': 'Users',
        'nav.addresses': 'Addresses',
        'nav.appSettings': 'App Settings',

        // Topbar / user menu
        'user.profile': 'Profile',
        'user.changePassword': 'Change password',
        'user.logout': 'Logout',
        'user.notifications': 'Notifications',

        // Dashboard home
        'dashboard.welcome': 'Welcome back',
        'dashboard.overview': 'Here is an overview of your shop',
        'dashboard.totalProducts': 'Total Products',
        'dashboard.totalUsers': 'Total Users',
        'dashboard.totalBranches': 'Total Branches',
        'dashboard.totalCategories': 'Categories',

        // Common
        'common.loading': 'Loading...',
        'common.search': 'Search...',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.actions': 'Actions',
        'common.comingSoon': 'Coming soon',
    },
    km: {
        // Login
        'login.title': 'ហ្គ្លីតធើ សប',
        'login.subtitle': 'ចូលប្រព័ន្ធដើម្បីប្រើប្រាស់ផ្ទាំងគ្រប់គ្រង',
        'login.email': 'អ៊ីមែល',
        'login.email.placeholder': 'admin@glittershop.com',
        'login.email.invalid': 'សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ',
        'login.password': 'ពាក្យសម្ងាត់',
        'login.password.placeholder': 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',
        'login.password.required': 'តម្រូវឲ្យបញ្ចូលពាក្យសម្ងាត់',
        'login.password.show': 'បង្ហាញពាក្យសម្ងាត់',
        'login.password.hide': 'លាក់ពាក្យសម្ងាត់',
        'login.submit': 'ចូលប្រព័ន្ធ',
        'login.welcome': 'សូមស្វាគមន៍',
        'login.staffOnly': 'ផ្ទាំងគ្រប់គ្រងនេះសម្រាប់តែបុគ្គលិក',

        // Toggles
        'theme.toggle': 'ប្ដូររូបរាង',
        'language.toggle': 'ប្ដូរភាសា',
        'language.english': 'English',
        'language.khmer': 'ភាសាខ្មែរ',

        // Sidebar groups
        'nav.dashboard': 'ផ្ទាំងគ្រប់គ្រង',
        'nav.group.catalog': 'ផលិតផល',
        'nav.group.operations': 'ប្រតិបត្តិការ',
        'nav.group.settings': 'ការកំណត់',
        'nav.products': 'ផលិតផល',
        'nav.categories': 'ប្រភេទ',
        'nav.brands': 'ម៉ាក',
        'nav.productImages': 'រូបភាពផលិតផល',
        'nav.productVariants': 'ប្រភេទផលិតផល',
        'nav.productBadges': 'ស្លាកសញ្ញា',
        'nav.branches': 'សាខា',
        'nav.inventory': 'ស្តុក',
        'nav.staff': 'បុគ្គលិក',
        'nav.users': 'អ្នកប្រើប្រាស់',
        'nav.addresses': 'អាសយដ្ឋាន',
        'nav.appSettings': 'ការកំណត់កម្មវិធី',

        // Topbar / user menu
        'user.profile': 'ប្រវត្តិរូប',
        'user.changePassword': 'ប្ដូរពាក្យសម្ងាត់',
        'user.logout': 'ចាកចេញ',
        'user.notifications': 'ការជូនដំណឹង',

        // Dashboard home
        'dashboard.welcome': 'សូមស្វាគមន៍',
        'dashboard.overview': 'ទិដ្ឋភាពទូទៅនៃហាងរបស់អ្នក',
        'dashboard.totalProducts': 'ផលិតផលសរុប',
        'dashboard.totalUsers': 'អ្នកប្រើប្រាស់សរុប',
        'dashboard.totalBranches': 'សាខាសរុប',
        'dashboard.totalCategories': 'ប្រភេទ',

        // Common
        'common.loading': 'កំពុងផ្ទុក...',
        'common.search': 'ស្វែងរក...',
        'common.cancel': 'បោះបង់',
        'common.save': 'រក្សាទុក',
        'common.delete': 'លុប',
        'common.edit': 'កែប្រែ',
        'common.create': 'បង្កើត',
        'common.actions': 'សកម្មភាព',
        'common.comingSoon': 'នឹងមកដល់ឆាប់ៗ',
    },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];

interface I18nState {
    language: Language;
    setLanguage: (language: Language) => void;
}

const useI18nStore = create<I18nState>()(
    persist(
        (set) => ({
            language: 'en',
            setLanguage: (language) => set({ language }),
        }),
        { name: 'glitter_language' },
    ),
);

export function useI18n() {
    const language = useI18nStore((s) => s.language);
    const setLanguage = useI18nStore((s) => s.setLanguage);

    const t = (key: TranslationKey): string => {
        return translations[language][key] ?? translations.en[key] ?? key;
    };

    return { language, setLanguage, t };
}