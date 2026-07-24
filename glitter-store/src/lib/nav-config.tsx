import {
    BadgePercent,
    Crown,
    Flame,
    Gem,
    Gift,
    Heart,
    Home,
    Info,
    LayoutGrid,
    MapPin,
    Package,
    Phone,
    Share2,
    Shirt,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    Tag,
    type LucideIcon,
} from 'lucide-react';
import type { StoreNavItem } from '@/lib/store-config';

export interface NavDef {
    href: string;
    trKey: string;
    Icon: LucideIcon;
}

/**
 * The fixed storefront menus (default labels + URLs + icons). Their order,
 * label, icon and visibility are all configurable from the dashboard
 * (config.navItems); the `id` fixes the destination URL.
 */
export const NAV_DEFS: Record<string, NavDef> = {
    home: { href: '/', trKey: 'navHome', Icon: Home },
    promotion: { href: '/promotion', trKey: 'navPromotion', Icon: BadgePercent },
    product: { href: '/products', trKey: 'navProduct', Icon: ShoppingBag },
    brand: { href: '/brands', trKey: 'navBrand', Icon: Gem },
    location: { href: '/stores', trKey: 'navLocation', Icon: MapPin },
    social: { href: '/about', trKey: 'navSocial', Icon: Share2 },
};

/**
 * Icons a merchant can pick for a nav item (name → component). The name is what
 * gets stored in the config; the dashboard picker lists the same set of names.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
    home: Home,
    'shopping-bag': ShoppingBag,
    package: Package,
    tag: Tag,
    'badge-percent': BadgePercent,
    gem: Gem,
    sparkles: Sparkles,
    star: Star,
    heart: Heart,
    gift: Gift,
    'map-pin': MapPin,
    store: Store,
    share: Share2,
    phone: Phone,
    info: Info,
    grid: LayoutGrid,
    shirt: Shirt,
    crown: Crown,
    flame: Flame,
};

/** Ordered list of icon names for the dashboard picker. */
export const NAV_ICON_NAMES = Object.keys(NAV_ICONS);

export interface ResolvedNavItem {
    id: string;
    href: string;
    Icon: LucideIcon;
    /** Default label key — used when no custom label is set. */
    trKey: string;
    /** Custom label overrides ('' = use trKey). */
    labelEn: string;
    labelKm: string;
}

/**
 * Resolve the configured nav items into renderable items: keeps only the
 * enabled ones with a known id, and applies the icon override (falling back to
 * the built-in icon). Custom labels are carried through for the caller to pick.
 */
export function resolveNavItems(items: StoreNavItem[]): ResolvedNavItem[] {
    return items
        .filter((it) => it.enabled && NAV_DEFS[it.id])
        .map((it) => {
            const def = NAV_DEFS[it.id];
            return {
                id: it.id,
                href: def.href,
                Icon: (it.icon && NAV_ICONS[it.icon]) || def.Icon,
                trKey: def.trKey,
                labelEn: it.labelEn ?? '',
                labelKm: it.labelKm ?? '',
            };
        });
}
