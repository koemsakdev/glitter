import {
    Boxes,
    BarChart3,
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
    Ticket,
    UserCog,
    History,
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

// Who sees what — mirrors the API's role rules (see the Staff page legend).
const ALL_STAFF: UserRole[] = ['cashier', 'manager', 'admin'];
const MANAGER_PLUS: UserRole[] = ['manager', 'admin'];
const ADMIN_ONLY: UserRole[] = ['admin'];

export const navigation: NavGroup[] = [
    {
        labelKey: 'nav.main',
        items: [
            {
                // Analytics home — cashiers don't have access to the stats it
                // shows, so it's manager+ only (cashiers land on Orders).
                href: '/dashboard',
                labelKey: 'nav.dashboard',
                icon: LayoutDashboard,
                roles: MANAGER_PLUS,
            },
            {
                // Sales reports: by day, payment, channel, cashier, product.
                href: '/dashboard/reports',
                labelKey: 'nav.reports',
                icon: BarChart3,
                roles: MANAGER_PLUS,
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
                roles: ADMIN_ONLY,
            },
            {
                href: '/dashboard/brands',
                labelKey: 'nav.brands',
                icon: Hexagon,
                roles: ADMIN_ONLY,
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
                roles: ADMIN_ONLY,
            },
            {
                href: '/dashboard/badges',
                labelKey: 'nav.badges',
                icon: Award,
                roles: ADMIN_ONLY,
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
                href: '/dashboard/promotions',
                labelKey: 'nav.promotions',
                icon: Ticket,
                roles: ADMIN_ONLY,
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
                comingSoon: false,
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
            {
                // Who did what — every staff create/update/delete + logins.
                href: '/dashboard/activity',
                labelKey: 'nav.activity',
                icon: History,
                roles: ADMIN_ONLY,
            },
        ],
    },
];

/**
 * Whether a role may open a dashboard path. Uses the most specific nav entry
 * that matches (so /dashboard/staff/123 follows /dashboard/staff). Paths not
 * in the menu (profile, notifications…) are open to every staff member.
 */
/** Pages not in the menu that still need a role (create/edit screens). */
const RESTRICTED_PATHS: { pattern: RegExp; roles: UserRole[] }[] = [
    // Only admins create or edit catalog products (one shared catalog).
    { pattern: /^\/dashboard\/products\/new\/?$/, roles: ADMIN_ONLY },
    { pattern: /^\/dashboard\/products\/[^/]+\/edit\/?$/, roles: ADMIN_ONLY },
];

export function canAccessPath(role: UserRole, pathname: string): boolean {
    const rule = RESTRICTED_PATHS.find((r) => r.pattern.test(pathname));
    if (rule) return rule.roles.includes(role);
    let best: NavItem | null = null;
    for (const group of navigation) {
        for (const item of group.items) {
            const match =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                    pathname.startsWith(`${item.href}/`));
            if (match && (!best || item.href.length > best.href.length)) {
                best = item;
            }
        }
    }
    return best ? best.roles.includes(role) : true;
}

/** First page a role can open (where to send them when access is denied). */
export function homePathForRole(role: UserRole): string {
    for (const group of navigation) {
        for (const item of group.items) {
            if (item.roles.includes(role) && !item.comingSoon) return item.href;
        }
    }
    return '/dashboard/profile';
}

export function filterNavigationByRole(role: UserRole): NavGroup[] {
    return navigation
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.roles.includes(role)),
        }))
        .filter((group) => group.items.length > 0);
}