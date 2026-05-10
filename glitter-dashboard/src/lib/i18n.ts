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
        'nav.main': 'Main',
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

        // Brands
        'brand.list.title': 'Brands',
        'brand.list.subtitle': 'Manage product brands',
        'brand.list.search': 'Search brands...',
        'brand.list.empty': 'No brands found. Create your first brand.',
        'brand.list.loading': 'Loading brands...',
        'brand.list.column.name': 'Name',
        'brand.list.column.slug': 'Slug',
        'brand.list.column.website': 'Website',
        'brand.list.column.status': 'Status',
        'brand.list.column.created': 'Created',
        'brand.action.create': 'Create Brand',
        'brand.action.edit': 'Edit',
        'brand.action.delete': 'Delete',
        'brand.field.name': 'Name',
        'brand.field.slug': 'Slug',
        'brand.field.slug.help': 'URL-friendly (lowercase, numbers, hyphens)',
        'brand.field.website': 'Website URL',
        'brand.field.description': 'Description',
        'brand.field.status': 'Status',
        'brand.field.logo': 'Logo',
        'brand.field.logo.help': 'Optional. PNG/JPG/WebP, max 2 MB.',
        'brand.field.logo.replace': 'Replace logo',
        'brand.field.logo.remove': 'Remove logo',
        'brand.status.active': 'Active',
        'brand.status.inactive': 'Inactive',
        'brand.status.all': 'All statuses',
        'brand.create.title': 'Create Brand',
        'brand.create.submit': 'Create',
        'brand.create.success': 'Brand created',
        'brand.edit.title': 'Edit Brand',
        'brand.edit.submit': 'Save Changes',
        'brand.edit.success': 'Brand updated',
        'brand.delete.title': 'Delete Brand?',
        'brand.delete.message': 'This will permanently delete "{name}". This action cannot be undone.',
        'brand.delete.confirm': 'Yes, delete',
        'brand.delete.success': 'Brand deleted',
        'brand.validation.nameRequired': 'Name is required',
        'brand.validation.slugRequired': 'Slug is required',
        'brand.validation.slugFormat': 'Slug must be lowercase letters, numbers, and hyphens only',
        'brand.validation.urlInvalid': 'Must be a valid URL',
        'brand.sort.label': 'Sort',
        'brand.sort.newest': 'Newest First',
        'brand.sort.oldest': 'Oldest First',
        'brand.sort.nameAsc': 'Name (A → Z)',
        'brand.sort.nameDesc': 'Name (Z → A)',
        'brand.sort.recentlyUpdated': 'Recently Updated',
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
        'nav.main': 'ទំព័រដើម',
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

        // Brands
        'brand.list.title': 'ម៉ាក',
        'brand.list.subtitle': 'គ្រប់គ្រងម៉ាកផលិតផល',
        'brand.list.search': 'ស្វែងរកម៉ាក...',
        'brand.list.empty': 'រកមិនឃើញម៉ាក។ បង្កើតម៉ាកដំបូងរបស់អ្នក។',
        'brand.list.loading': 'កំពុងផ្ទុកម៉ាក...',
        'brand.list.column.name': 'ឈ្មោះ',
        'brand.list.column.slug': 'ស្លាក',
        'brand.list.column.website': 'គេហទំព័រ',
        'brand.list.column.status': 'ស្ថានភាព',
        'brand.list.column.created': 'បានបង្កើត',
        'brand.action.create': 'បង្កើតម៉ាក',
        'brand.action.edit': 'កែប្រែ',
        'brand.action.delete': 'លុប',
        'brand.field.name': 'ឈ្មោះ',
        'brand.field.slug': 'ស្លាក',
        'brand.field.slug.help': 'អត្តសញ្ញាណ URL (អក្សរតូច លេខ និងសញ្ញា -)',
        'brand.field.website': 'URL គេហទំព័រ',
        'brand.field.description': 'ការពិពណ៌នា',
        'brand.field.status': 'ស្ថានភាព',
        'brand.field.logo': 'រូបសញ្ញា',
        'brand.field.logo.help': 'ស្រេចចិត្ត។ PNG/JPG/WebP អតិបរមា 2 MB។',
        'brand.field.logo.replace': 'ប្ដូររូបសញ្ញា',
        'brand.field.logo.remove': 'លុបរូបសញ្ញា',
        'brand.status.active': 'សកម្ម',
        'brand.status.inactive': 'អសកម្ម',
        'brand.status.all': 'គ្រប់ស្ថានភាព',
        'brand.create.title': 'បង្កើតម៉ាក',
        'brand.create.submit': 'បង្កើត',
        'brand.create.success': 'បានបង្កើតម៉ាក',
        'brand.edit.title': 'កែប្រែម៉ាក',
        'brand.edit.submit': 'រក្សាទុកការផ្លាស់ប្ដូរ',
        'brand.edit.success': 'បានកែប្រែម៉ាក',
        'brand.delete.title': 'លុបម៉ាក?',
        'brand.delete.message': 'នេះនឹងលុប "{name}" ជាអចិន្ត្រៃយ៍។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
        'brand.delete.confirm': 'យល់ព្រម លុប',
        'brand.delete.success': 'បានលុបម៉ាក',
        'brand.validation.nameRequired': 'តម្រូវឲ្យបញ្ចូលឈ្មោះ',
        'brand.validation.slugRequired': 'តម្រូវឲ្យបញ្ចូលស្លាក',
        'brand.validation.slugFormat': 'ស្លាកត្រូវមានតែអក្សរតូច លេខ និងសញ្ញា - ប៉ុណ្ណោះ',
        'brand.validation.urlInvalid': 'ត្រូវជា URL ត្រឹមត្រូវ',
        'brand.sort.label': 'តម្រៀប',
        'brand.sort.newest': 'ថ្មីបំផុតមុន',
        'brand.sort.oldest': 'ចាស់បំផុតមុន',
        'brand.sort.nameAsc': 'ឈ្មោះ (A → Z)',
        'brand.sort.nameDesc': 'ឈ្មោះ (Z → A)',
        'brand.sort.recentlyUpdated': 'បានកែសម្រួលថ្មីៗ',
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