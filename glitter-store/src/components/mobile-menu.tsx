/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Flag from 'react-world-flags';
import { ChevronRight, Globe, LogIn, Menu, Moon, Sun } from 'lucide-react';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { resolveNavItems } from '@/lib/nav-config';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreNavItem } from '@/lib/store-config';
import { cn } from '@/lib/utils';

const LANGS: { code: Lang; country: string; native: string }[] = [
    { code: 'en', country: 'US', native: 'English' },
    { code: 'km', country: 'KH', native: 'ខ្មែរ' },
];

const segBtn =
    'flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]';
const segActive =
    'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-zinc-950 dark:text-white dark:ring-white/10';
const segIdle =
    'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200';

/**
 * Mobile-only hamburger. The bottom bar carries the 5 core actions; every
 * storefront menu (in the dashboard-configured order) lives here.
 */
export function MobileMenu({
    lang,
    navItems,
    shopName,
    tagline,
    logo,
}: {
    lang: Lang;
    navItems: StoreNavItem[];
    shopName: string;
    tagline?: string;
    logo?: string | null;
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { lang: activeLang, setLang } = useLang(lang);
    const items = resolveNavItems(navItems);

    // Theme toggle (guest-accessible, mirrors the profile Appearance card).
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);
    function applyTheme(dark: boolean) {
        setIsDark(dark);
        document.documentElement.classList.toggle('dark', dark);
        try {
            localStorage.setItem('theme', dark ? 'dark' : 'light');
        } catch {
            /* ignore */
        }
    }

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <Sheet>
            <SheetTrigger
                aria-label={tr(lang, 'menu')}
                className="flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:text-(--brand) dark:text-zinc-300 lg:hidden"
            >
                <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent className="w-80 gap-0 p-0">
                {/* Brand header */}
                <div className="flex items-center gap-3 bg-linear-to-br from-(--brand)/10 to-transparent px-5 py-5">
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logo}
                            alt={shopName}
                            className="size-11 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                        />
                    ) : (
                        <span className="flex size-11 items-center justify-center rounded-2xl bg-(--brand) text-lg font-bold text-white">
                            {shopName.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0">
                        <SheetTitle className="truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {shopName}
                        </SheetTitle>
                        {tagline && (
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {tagline}
                            </p>
                        )}
                    </div>
                </div>

                {/* Menu list */}
                <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
                    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        {tr(lang, 'menu')}
                    </p>
                    <nav className="flex flex-col gap-1">
                        {items.map(({ id, href, trKey, Icon, labelEn, labelKm }) => {
                            const active = isActive(href);
                            return (
                                <SheetClose asChild key={id}>
                                    <Link
                                        href={href}
                                        className={cn(
                                            'group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm font-medium transition-colors',
                                            active
                                                ? 'bg-(--brand)/10 text-(--brand)'
                                                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                                                active
                                                    ? 'bg-(--brand) text-white'
                                                    : 'bg-zinc-100 text-zinc-500 group-hover:text-(--brand) dark:bg-zinc-800 dark:text-zinc-400',
                                            )}
                                        >
                                            <Icon className="size-5" />
                                        </span>
                                        <span className="flex-1">
                                            {pick(lang, labelEn, labelKm) ||
                                                tr(lang, trKey)}
                                        </span>
                                        <ChevronRight
                                            className={cn(
                                                'size-4 shrink-0 transition-opacity',
                                                active
                                                    ? 'opacity-100'
                                                    : 'opacity-0 group-hover:opacity-40',
                                            )}
                                        />
                                    </Link>
                                </SheetClose>
                            );
                        })}
                    </nav>
                </div>

                {/* Preferences + account, pinned to the bottom. Available to
                    everyone — guests can switch language / theme without login. */}
                <div className="mt-auto">
                    {/* Preferences: language + light/dark */}
                    <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
                        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            {tr(lang, 'preferences')}
                        </p>
                        <div className="mb-1.5 flex items-center gap-2 px-2">
                            <Globe className="size-3.5 text-(--brand)" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {tr(lang, 'language')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
                            {LANGS.map((o) => (
                                <button
                                    key={o.code}
                                    type="button"
                                    onClick={() => setLang(o.code)}
                                    aria-pressed={activeLang === o.code}
                                    className={cn(
                                        segBtn,
                                        activeLang === o.code
                                            ? segActive
                                            : segIdle,
                                    )}
                                >
                                    <span className="size-5 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15">
                                        <Flag
                                            code={o.country}
                                            className="size-full object-cover"
                                        />
                                    </span>
                                    {o.native}
                                </button>
                            ))}
                        </div>

                        <div className="mb-1.5 mt-3 flex items-center gap-2 px-2">
                            <Moon className="size-3.5 text-(--brand)" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {tr(lang, 'appearance')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
                            <button
                                type="button"
                                onClick={() => applyTheme(false)}
                                disabled={!mounted}
                                aria-pressed={mounted && !isDark}
                                className={cn(
                                    segBtn,
                                    mounted && !isDark ? segActive : segIdle,
                                )}
                            >
                                <Sun className="size-4" />
                                {tr(lang, 'light')}
                            </button>
                            <button
                                type="button"
                                onClick={() => applyTheme(true)}
                                disabled={!mounted}
                                aria-pressed={mounted && isDark}
                                className={cn(
                                    segBtn,
                                    mounted && isDark ? segActive : segIdle,
                                )}
                            >
                                <Moon className="size-4" />
                                {tr(lang, 'dark')}
                            </button>
                        </div>
                    </div>

                    {/* Account footer */}
                    <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                    <SheetClose asChild>
                        <Link
                            href={user ? '/account' : '/account/login'}
                            className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            {user ? (
                                <>
                                    <UserAvatar
                                        src={user.profileImageUrl}
                                        name={user.fullName}
                                        className="size-9 shrink-0 rounded-full text-xs"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                            {user.fullName}
                                        </span>
                                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                            {tr(lang, 'account')}
                                        </span>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                                        <LogIn className="size-5" />
                                    </span>
                                    <span className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                        {tr(lang, 'login')}
                                    </span>
                                </>
                            )}
                            <ChevronRight className="size-4 shrink-0 text-zinc-400" />
                        </Link>
                    </SheetClose>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
