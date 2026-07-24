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

/**
 * Icon name → component, kept in sync with the storefront's NAV_ICONS. The name
 * string is what gets stored in the config; the storefront maps the same names.
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

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS);

/** Built-in default icon per nav id (shown when no custom icon is chosen). */
export const DEFAULT_NAV_ICON: Record<string, LucideIcon> = {
    home: Home,
    promotion: BadgePercent,
    product: ShoppingBag,
    brand: Gem,
    location: MapPin,
    social: Share2,
};
