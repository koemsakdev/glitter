import Link from 'next/link';
import { AccountButton } from '@/components/account-button';
import { AnnouncementBar } from '@/components/announcement-bar';
import { CartButton } from '@/components/cart-button';
import { LanguageToggle } from '@/components/language-toggle';
import { NavLink } from '@/components/nav-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { fileUrl } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';
import type { MenuItem } from '@/lib/types';

export function SiteHeader({
    config,
    lang,
    menu = [],
}: {
    config: StoreConfig;
    lang: Lang;
    menu?: MenuItem[];
}) {
    const shopName = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const logo = fileUrl(config.logoUrl);
    const topMenu = menu.filter((m) => !m.parentId);

    return (
        <div className="sticky top-0 z-40">
            <AnnouncementBar announcements={config.announcements} lang={lang} />
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

                    {/* Nav */}
                    <nav className="ml-2 hidden items-center gap-1 sm:flex">
                        {topMenu.length > 0 ? (
                            topMenu.map((item) => {
                                const children = menu.filter(
                                    (m) => m.parentId === item.id,
                                );
                                const itemLink = (
                                    <NavLink
                                        href={item.url}
                                        target={
                                            item.openInNewTab
                                                ? '_blank'
                                                : undefined
                                        }
                                        rel={
                                            item.openInNewTab
                                                ? 'noopener noreferrer'
                                                : undefined
                                        }
                                    >
                                        {pick(lang, item.labelEn, item.labelKm)}
                                        {children.length > 0 && (
                                            <svg
                                                className="size-3.5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        )}
                                    </NavLink>
                                );
                                if (children.length === 0) {
                                    return (
                                        <div key={item.id}>{itemLink}</div>
                                    );
                                }
                                return (
                                    <div
                                        key={item.id}
                                        className="group relative"
                                    >
                                        {itemLink}
                                        <div className="invisible absolute left-0 top-full z-50 min-w-44 rounded-lg border border-zinc-200 bg-white p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                                            {children.map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={child.url}
                                                    target={
                                                        child.openInNewTab
                                                            ? '_blank'
                                                            : undefined
                                                    }
                                                    rel={
                                                        child.openInNewTab
                                                            ? 'noopener noreferrer'
                                                            : undefined
                                                    }
                                                    className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-(--brand)"
                                                >
                                                    {pick(
                                                        lang,
                                                        child.labelEn,
                                                        child.labelKm,
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <>
                                <NavLink href="/">{tr(lang, 'home')}</NavLink>
                                <NavLink href="/products">
                                    {tr(lang, 'shop')}
                                </NavLink>
                            </>
                        )}
                    </nav>

                    {/* Search (desktop, inline) */}
                    <form
                        action="/products"
                        method="get"
                        className="ml-auto hidden max-w-xs flex-1 items-center sm:flex"
                    >
                        <div className="relative w-full">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="search"
                                name="search"
                                placeholder={tr(lang, 'search')}
                                className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-900"
                            />
                        </div>
                    </form>

                    <div className="ml-auto flex items-center gap-0.5 sm:ml-0 sm:gap-1">
                        <ThemeToggle />
                        <LanguageToggle lang={lang} />
                        <Link
                            href="/account"
                            aria-label={tr(lang, 'notifications')}
                            title={tr(lang, 'notifications')}
                            className="flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:text-(--brand) dark:text-zinc-300"
                        >
                            <svg
                                className="size-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                            </svg>
                        </Link>
                        <AccountButton lang={lang} />
                        <CartButton label={tr(lang, 'cart')} />
                    </div>
                  </div>

                  {/* Search (mobile, full-width row) */}
                  <form
                      action="/products"
                      method="get"
                      className="pb-3 sm:hidden"
                  >
                      <div className="relative">
                          <svg
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                          >
                              <circle cx="11" cy="11" r="7" />
                              <path d="m21 21-4.3-4.3" />
                          </svg>
                          <input
                              type="search"
                              name="search"
                              placeholder={tr(lang, 'search')}
                              className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                      </div>
                  </form>
                </div>
            </header>
        </div>
    );
}
