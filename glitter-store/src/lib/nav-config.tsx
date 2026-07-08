import {
    BadgePercent,
    Gem,
    Home,
    MapPin,
    Share2,
    ShoppingBag,
    type LucideIcon,
} from 'lucide-react';

export interface NavDef {
    href: string;
    trKey: string;
    Icon: LucideIcon;
}

/**
 * The fixed storefront menus (labels + URLs + icons). Only their display order
 * is configurable from the dashboard (config.navOrder). Shared by the desktop
 * top nav and the mobile bottom nav so both stay identical.
 */
export const NAV_DEFS: Record<string, NavDef> = {
    home: { href: '/', trKey: 'navHome', Icon: Home },
    promotion: { href: '/promotion', trKey: 'navPromotion', Icon: BadgePercent },
    product: { href: '/products', trKey: 'navProduct', Icon: ShoppingBag },
    brand: { href: '/brands', trKey: 'navBrand', Icon: Gem },
    location: { href: '/stores', trKey: 'navLocation', Icon: MapPin },
    social: { href: '/about', trKey: 'navSocial', Icon: Share2 },
};

/** Resolve a navOrder id list into renderable nav items (unknown ids skipped). */
export function resolveNavItems(
    navOrder: string[],
): (NavDef & { id: string })[] {
    return navOrder
        .map((id) => (NAV_DEFS[id] ? { id, ...NAV_DEFS[id] } : null))
        .filter((n): n is NavDef & { id: string } => n !== null);
}
