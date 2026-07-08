import Link from 'next/link';
import { AccountButton } from '@/components/account-button';
import { AnnouncementBar } from '@/components/announcement-bar';
import { CartButton } from '@/components/cart-button';
import { HeaderSearch } from '@/components/header-search';
import { LanguageToggle } from '@/components/language-toggle';
import { MobileMenu } from '@/components/mobile-menu';
import { NavLink } from '@/components/nav-link';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { fileUrl, type PublicPromo } from '@/lib/api';
import { resolveNavItems } from '@/lib/nav-config';
import { pick, tr, type Lang } from '@/lib/locale';
import { DEFAULT_NAV_ORDER, type StoreConfig } from '@/lib/store-config';
import type { MenuItem, Product } from '@/lib/types';

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

    // Render the nav in the dashboard-configured order (shared with the mobile
    // bottom nav so both are identical).
    const navItems = resolveNavItems(config.navOrder ?? DEFAULT_NAV_ORDER);

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

                    <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                        {/* Always visible: search, notifications, language, theme */}
                        <HeaderSearch
                            lang={lang}
                            hotkey
                            initialPopular={popular}
                        />
                        <NotificationBell lang={lang} />
                        <LanguageToggle lang={lang} />
                        <ThemeToggle />
                        {/* Desktop-only: cart + profile live in the mobile
                            bottom bar, so they're not duplicated here. */}
                        <div className="hidden items-center gap-1.5 lg:flex">
                            <Separator orientation="vertical" />
                            <CartButton label={tr(lang, 'cart')} />
                            <AccountButton lang={lang} />
                        </div>
                        {/* Mobile hamburger — last, opens the full menu drawer */}
                        <MobileMenu
                            lang={lang}
                            navOrder={config.navOrder ?? DEFAULT_NAV_ORDER}
                            shopName={shopName}
                            tagline={pick(lang, config.taglineEn, config.taglineKm)}
                            logo={logo}
                        />
                    </div>
                  </div>
                </div>
            </header>
        </div>
    );
}
