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
                        
                        {/* Logo Element */}
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
                                    <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 hidden sm:block">
                                        {shopName}
                                    </span>
                                </>
                            )}
                        </Link>

                        {/* Topbar Desktop Navigation:
                            - Hidden completely on mobile screen widths (< 768px)
                            - Morph to matching standalone utility-button styles on `md` screens
                            - Expand back to a full textual inline menu link on standard desktop views (`lg`)
                        */}
                        <nav className="ml-2 hidden items-center gap-1 md:flex">
                            {navItems.map(({ id, href, trKey, Icon }) => (
                                <NavLink 
                                    key={id} 
                                    href={href} 
                                    className="flex items-center justify-center transition-colors rounded-full text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50
                                               md:size-9 md:hover:bg-zinc-100 md:dark:hover:bg-zinc-800
                                               lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 lg:rounded-lg lg:gap-2 lg:hover:bg-zinc-50 lg:dark:hover:bg-zinc-900"
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span className="hidden lg:inline text-sm font-medium">
                                        {tr(lang, trKey)}
                                    </span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* Control Actions & Global Utilities Wrapper */}
                        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                            <HeaderSearch
                                lang={lang}
                                hotkey
                                initialPopular={popular}
                            />
                            
                            <Separator orientation="vertical" className="h-4 hidden sm:block" />
                            <NotificationBell lang={lang} />
                            
                            <Separator orientation="vertical" className="h-4" />
                            <LanguageToggle lang={lang} />
                            
                            <Separator orientation="vertical" className="h-4" />
                            <ThemeToggle />
                            
                            {/* Desktop Commerce Core: visible exclusively on tablet views and up */}
                            <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
                                <Separator orientation="vertical" className="h-4" />
                                <CartButton label={tr(lang, 'cart')} />
                                <Separator orientation="vertical" className="h-4" />
                                <AccountButton lang={lang} />
                            </div>

                            {/* Mobile Hamburger Side-Drawer Button: Strictly hidden above mobile widths */}
                            <div className="md:hidden flex items-center gap-1">
                                <Separator orientation="vertical" className="h-4" />
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
                </div>
            </header>
        </div>
    );
}