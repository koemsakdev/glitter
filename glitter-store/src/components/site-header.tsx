import Link from 'next/link';
import {
    Home,
    BadgePercent,
    ShoppingBag,
    Gem,
    MapPin,
    Share2,
    type LucideIcon,
} from 'lucide-react';
import { AccountButton } from '@/components/account-button';
import { AnnouncementBar } from '@/components/announcement-bar';
import { CartButton } from '@/components/cart-button';
import { HeaderSearch } from '@/components/header-search';
import { LanguageToggle } from '@/components/language-toggle';
import { NavLink } from '@/components/nav-link';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { fileUrl, type PublicPromo } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import { DEFAULT_NAV_ORDER, type StoreConfig } from '@/lib/store-config';
import type { MenuItem, Product } from '@/lib/types';

/**
 * Storefront primary navigation — the fixed set of menus (labels + URLs +
 * icons) lives here in code; only their display ORDER is configurable from the
 * dashboard (config.navOrder). `trKey` resolves to a bilingual label.
 */
const NAV_DEFS: Record<
    string,
    { href: string; trKey: string; Icon: LucideIcon }
> = {
    home: { href: '/', trKey: 'navHome', Icon: Home },
    promotion: { href: '/promotion', trKey: 'navPromotion', Icon: BadgePercent },
    product: { href: '/products', trKey: 'navProduct', Icon: ShoppingBag },
    brand: { href: '/brands', trKey: 'navBrand', Icon: Gem },
    location: { href: '/stores', trKey: 'navLocation', Icon: MapPin },
    social: { href: '/about', trKey: 'navSocial', Icon: Share2 },
};

export function SiteHeader({
    config,
    lang,
    promos = [],
    popular = [],
}: {
    config: StoreConfig;
    lang: Lang;
    menu?: MenuItem[];
    promos?: PublicPromo[];
    popular?: Product[];
}) {
    const shopName = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const logo = fileUrl(config.logoUrl);

    // Render the nav in the dashboard-configured order (unknown ids skipped).
    const navItems = (config.navOrder ?? DEFAULT_NAV_ORDER)
        .map((id) => ({ id, ...NAV_DEFS[id] }))
        .filter((n) => n.href);

    return (
        <div className="sticky top-0 z-40">
            <AnnouncementBar
                announcements={config.announcements}
                lang={lang}
                promos={promos}
            />
            <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <div className="mx-auto max-w-6xl px-4">
                  <div className="flex h-16 items-center gap-3">
                    {/* Logo — show the logo image alone when set, else a badge + name */}
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2"
                        aria-label={shopName}
                    >
                        {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logo}
                                alt={shopName}
                                className="size-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                            />
                        ) : (
                            <>
                                <span className="flex size-9 items-center justify-center rounded-xl bg-(--brand) text-sm font-bold text-white">
                                    {shopName.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                    {shopName}
                                </span>
                            </>
                        )}
                    </Link>

                    {/* Nav — fixed menus, ordered via the dashboard */}
                    <nav className="ml-2 hidden items-center gap-1 lg:flex">
                        {navItems.map(({ id, href, trKey, Icon }) => (
                            <NavLink key={id} href={href}>
                                <Icon className="size-4" />
                                {tr(lang, trKey)}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        {/* Search — opens a command palette (⌘K) */}
                        <HeaderSearch
                            lang={lang}
                            hotkey
                            initialPopular={popular}
                        />
                        <Separator orientation="vertical" />
                        <LanguageToggle lang={lang} />
                        <Separator orientation="vertical" />
                        <NotificationBell lang={lang} />
                        <Separator orientation="vertical" />
                        <ThemeToggle />
                        <Separator orientation="vertical" />
                        <CartButton label={tr(lang, 'cart')} />
                        <Separator orientation="vertical" />
                        <AccountButton lang={lang} />
                    </div>
                  </div>
                </div>
            </header>
        </div>
    );
}
