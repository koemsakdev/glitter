import {
    Award,
    Boxes,
    Building2,
    Image as ImageIcon,
    LayoutDashboard,
    MapPin,
    Package,
    Palette,
    Settings,
    Shapes,
    Sparkles,
    UserCog,
    Users,
    type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';
import type { UserRole } from '@/types/api';

export interface NavItem {
    href: string;
    labelKey: TranslationKey;
    icon: LucideIcon;
    roles: UserRole[];
}

export interface NavGroup {
    labelKey: TranslationKey | null; // null = no group label (e.g., dashboard home)
    items: NavItem[];
}

const ALL_STAFF: UserRole[] = [
    'cashier',
    'manager',
    'admin',
    'super_admin',
];
const MANAGER_PLUS: UserRole[] = ['manager', 'admin', 'super_admin'];
const ADMIN_ONLY: UserRole[] = ['admin', 'super_admin'];
const SUPER_ONLY: UserRole[] = ['super_admin'];

export const navigation: NavGroup[] = [
    {
        labelKey: 'nav.main',
        items: [
            {
                href: '/dashboard',
                labelKey: 'nav.dashboard',
                icon: LayoutDashboard,
                roles: ALL_STAFF,
            },
        ],
    },
    {
        labelKey: 'nav.group.catalog',
        items: [
            {
                href: '/dashboard/products',
                labelKey: 'nav.products',
                icon: Package,
                roles: ALL_STAFF,
            },
            {
                href: '/dashboard/categories',
                labelKey: 'nav.categories',
                icon: Shapes,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/brands',
                labelKey: 'nav.brands',
                icon: Sparkles,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/product-images',
                labelKey: 'nav.productImages',
                icon: ImageIcon,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/product-variants',
                labelKey: 'nav.productVariants',
                icon: Palette,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/product-badges',
                labelKey: 'nav.productBadges',
                icon: Award,
                roles: MANAGER_PLUS,
            },
        ],
    },
    {
        labelKey: 'nav.group.operations',
        items: [
            {
                href: '/dashboard/branches',
                labelKey: 'nav.branches',
                icon: Building2,
                roles: ADMIN_ONLY,
            },
            {
                href: '/dashboard/inventory',
                labelKey: 'nav.inventory',
                icon: Boxes,
                roles: ALL_STAFF,
            },
            {
                href: '/dashboard/staff',
                labelKey: 'nav.staff',
                icon: UserCog,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/users',
                labelKey: 'nav.users',
                icon: Users,
                roles: ADMIN_ONLY,
            },
            {
                href: '/dashboard/addresses',
                labelKey: 'nav.addresses',
                icon: MapPin,
                roles: ADMIN_ONLY,
            },
        ],
    },
    {
        labelKey: 'nav.group.settings',
        items: [
            {
                href: '/dashboard/app-settings',
                labelKey: 'nav.appSettings',
                icon: Settings,
                roles: SUPER_ONLY,
            },
        ],
    },
];

export function filterNavigationByRole(role: UserRole): NavGroup[] {
    return navigation
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.roles.includes(role)),
        }))
        .filter((group) => group.items.length > 0);
}