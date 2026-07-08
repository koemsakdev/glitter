'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, MapPin, ShoppingCart, User } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

/**
 * Fixed mobile utility bar: Home · Wishlist · Cart (center) · Location · Profile.
 * All other storefront menus live in the header hamburger drawer.
 */
export function MobileBottomNav({ lang }: { lang: Lang }) {
    const pathname = usePathname();
    const { itemCount, hydrated } = useCart();
    const { user } = useAuth();

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    const cartActive = pathname === '/cart';

    const tab = (
        href: string,
        label: string,
        Icon: typeof Home,
        active: boolean,
        avatar?: boolean,
    ) => (
        <Link
            href={href}
            className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-(--brand)' : 'text-zinc-500 dark:text-zinc-400',
            )}
        >
            <span
                className={cn(
                    'absolute top-0 h-0.5 w-6 rounded-full bg-(--brand) transition-opacity',
                    active ? 'opacity-100' : 'opacity-0',
                )}
            />
            {avatar && user ? (
                <UserAvatar
                    src={user.profileImageUrl}
                    name={user.fullName}
                    className={cn(
                        'size-5.5 rounded-full text-[9px]',
                        active && 'ring-2 ring-(--brand)',
                    )}
                />
            ) : (
                <Icon className="size-5.5" />
            )}
            <span className="max-w-full truncate px-0.5">{label}</span>
        </Link>
    );

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
            <div className="mx-auto flex max-w-md items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
                {tab('/', tr(lang, 'navHome'), Home, isActive('/', true))}
                {tab(
                    '/account/wishlist',
                    tr(lang, 'savedItems'),
                    Heart,
                    isActive('/account/wishlist'),
                )}

                {/* Elevated center cart button */}
                <div className="flex w-16 shrink-0 justify-center">
                    <Link
                        href="/cart"
                        aria-label={tr(lang, 'cart')}
                        className="group relative -mt-7 flex size-16 items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
                    >
                        {hydrated && itemCount > 0 && (
                            <span className="cart-pulse absolute inset-1.5 rounded-full bg-(--brand)" />
                        )}
                        <span
                            className={cn(
                                'relative flex size-16 items-center justify-center rounded-full text-white shadow-lg ring-[6px] ring-white dark:ring-zinc-950',
                                cartActive
                                    ? 'bg-linear-to-br from-rose-500 to-rose-600 shadow-rose-500/40'
                                    : 'bg-linear-to-br from-(--brand) to-rose-500 shadow-(--brand)/45',
                            )}
                        >
                            <ShoppingCart className="cart-bob size-7" />
                            {hydrated && itemCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-(--brand) shadow ring-2 ring-(--brand) tabular-nums">
                                    {itemCount}
                                </span>
                            )}
                        </span>
                    </Link>
                </div>

                {tab('/stores', tr(lang, 'navLocation'), MapPin, isActive('/stores'))}
                {tab(
                    user ? '/account' : '/account/login',
                    tr(lang, 'profile'),
                    User,
                    isActive('/account', true) || pathname === '/account/login',
                    true,
                )}
            </div>
        </nav>
    );
}
