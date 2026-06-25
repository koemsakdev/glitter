import {
    Boxes,
    Building2,
    Hexagon,
    LayoutDashboard,
    Award,
    Megaphone,
    Package,
    Palette,
    Paintbrush,
    Receipt,
    Shapes,
    Star,
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
    /** Mark as "Coming soon" — renders disabled with a Soon pill. */
    comingSoon?: boolean;
}

export interface NavGroup {
    labelKey: TranslationKey | null;
    items: NavItem[];
}

const ALL_STAFF: UserRole[] = ['cashier', 'manager', 'admin', 'super_admin'];
const MANAGER_PLUS: UserRole[] = ['manager', 'admin', 'super_admin'];
const ADMIN_ONLY: UserRole[] = ['admin', 'super_admin'];

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
                icon: Hexagon,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/reviews',
                labelKey: 'nav.reviews',
                icon: Star,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/colors',
                labelKey: 'nav.colors',
                icon: Palette,
                roles: MANAGER_PLUS,
            },
            {
                href: '/dashboard/badges',
                labelKey: 'nav.badges',
                icon: Award,
                roles: MANAGER_PLUS,
            },
        ],
    },
    {
        labelKey: 'nav.group.sales',
        items: [
            {
                href: '/dashboard/orders',
                labelKey: 'nav.orders',
                icon: Receipt,
                roles: ALL_STAFF,
            },
            {
                href: '/dashboard/customers',
                labelKey: 'nav.customers',
                icon: Users,
                roles: ADMIN_ONLY,
                comingSoon: false,
            },
            {
                href: '/dashboard/inventory',
                labelKey: 'nav.inventory',
                icon: Boxes,
                roles: ALL_STAFF,
                comingSoon: true,
            },
        ],
    },
    {
        labelKey: 'nav.group.storefront',
        items: [
            {
                href: '/dashboard/app-settings',
                labelKey: 'nav.appSettings',
                icon: Paintbrush,
                roles: ADMIN_ONLY,
            },
            {
                href: '/dashboard/advertisements',
                labelKey: 'nav.advertisements',
                icon: Megaphone,
                roles: ADMIN_ONLY,
            },
        ],
    },
    {
        labelKey: 'nav.group.settings',
        items: [
            {
                href: '/dashboard/branches',
                labelKey: 'nav.branches',
                icon: Building2,
                roles: ADMIN_ONLY,
                comingSoon: false,
            },
            {
                href: '/dashboard/staff',
                labelKey: 'nav.staffAccess',
                icon: UserCog,
                roles: ADMIN_ONLY,
                comingSoon: false,
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