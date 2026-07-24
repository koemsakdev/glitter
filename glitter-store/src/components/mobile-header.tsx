'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeaderSearch } from '@/components/header-search';
import { NotificationBell } from '@/components/notification-bell';
import { MobileMenu } from '@/components/mobile-menu';
import { BackLink } from '@/components/ui/back-link';
import { fileUrl, type PublicPromo } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { pick, tr, type Lang } from '@/lib/locale';
import { DEFAULT_NAV_ITEMS, type StoreConfig } from '@/lib/store-config';
import type { Product } from '@/lib/types';

// Bottom-nav destinations — these are "roots" (no back button on mobile).
const ROOTS = ['/', '/stores', '/account', '/account/wishlist'];

// Centred app-bar title per route, native-app style. Roots (logo) and screens
// that render their own bar are excluded; unknown routes just show the back
// button and let the page's own heading act as the title.
const TITLES: Record<string, string> = {
    '/products': 'navProduct',
    '/brands': 'brands',
    '/cart': 'cart',
    '/promotion': 'promoTitle',
    '/about': 'aboutTitle',
    '/account/login': 'login',
    '/account/register': 'register',
};

/**
 * Native-app top bar shown on mobile/tablet in place of the web header (which is
 * desktop-only). Tab-root screens show the store logo + search; every other
 * screen shows a back button and lets its own large heading act as the title.
 * Screens that render their own app bar (checkout, product detail, order
 * screens) get nothing here.
 */
export function MobileHeader({
    config,
    lang: initialLang,
    popular = [],
}: {
    config: StoreConfig;
    lang: Lang;
    promos?: PublicPromo[];
    popular?: Product[];
}) {
    const { lang } = useLang(initialLang);
    const pathname = usePathname();

    // These screens own their top bar — don't stack a second one.
    if (
        pathname === '/checkout' ||
        pathname.startsWith('/products/') ||
        pathname.startsWith('/account/orders')
    ) {
        return null;
    }

    const brand = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const logo = fileUrl(config.logoUrl);
    const isRoot = ROOTS.includes(pathname);
    const showSearch = pathname === '/';
    const title = !isRoot && TITLES[pathname] ? tr(lang, TITLES[pathname]) : '';

    return (
        <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-zinc-100/80 bg-white/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/85">
            {/* Dead-centre title, native app-bar style (non-root screens only) */}
            {title && (
                <h1 className="pointer-events-none absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {title}
                </h1>
            )}
            {isRoot ? (
                <Link
                    href="/"
                    aria-label={brand}
                    className="flex min-w-0 items-center gap-2"
                >
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logo}
                            alt={brand}
                            style={{ borderRadius: `${config.logoRadius}%` }}
                            className="size-8 shrink-0 object-contain"
                        />
                    ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brand) text-sm font-bold text-white">
                            {brand.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <span className="truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {brand}
                    </span>
                </Link>
            ) : (
                <BackLink lang={lang} useHistory fallbackHref="/" />
            )}

            <div className="ml-auto flex items-center gap-1.5">
                {showSearch && (
                    <HeaderSearch lang={lang} initialPopular={popular} />
                )}
                <NotificationBell lang={lang} />
                <MobileMenu
                    lang={lang}
                    navItems={config.navItems ?? DEFAULT_NAV_ITEMS}
                    shopName={brand}
                    tagline={pick(lang, config.taglineEn, config.taglineKm)}
                    logo={logo}
                />
            </div>
        </div>
    );
}
