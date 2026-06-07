import {
    Boxes,
    Building2,
    Hexagon,
    LayoutDashboard,
    MapPin,
    Package,
    Settings,
    Shapes,
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
                icon: Hexagon,
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
                comingSoon: false,
            },
            {
                href: '/dashboard/inventory',
                labelKey: 'nav.inventory',
                icon: Boxes,
                roles: ALL_STAFF,
                comingSoon: true,
            },
            {
                href: '/dashboard/staff',
                labelKey: 'nav.staff',
                icon: UserCog,
                roles: MANAGER_PLUS,
                comingSoon: true,
            },
            {
                href: '/dashboard/users',
                labelKey: 'nav.users',
                icon: Users,
                roles: ADMIN_ONLY,
                comingSoon: true,
            },
            {
                href: '/dashboard/addresses',
                labelKey: 'nav.addresses',
                icon: MapPin,
                roles: ADMIN_ONLY,
                comingSoon: true,
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
                comingSoon: true,
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