'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, MapPin, ShoppingCart, User } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

export function MobileBottomNav({ lang }: { lang: Lang }) {
    const pathname = usePathname();
    const { itemCount, hydrated } = useCart();
    const { user } = useAuth();

    // Checkout and product detail are app-style flows with their own fixed
    // bottom action bar — hide the tab bar there so the two don't stack.
    if (pathname === '/checkout' || pathname.startsWith('/products/'))
        return null;

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    const cartActive = pathname === '/checkout' || pathname === '/cart';

    const tab = (
        href: string,
        label: string,
        Icon: typeof Home,
        active: boolean,
        avatar?: boolean,
        badgeCount?: number,
    ) => (
        <Link
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className="group relative flex flex-1 flex-col items-center justify-center gap-1"
        >
            {/* Active indicator — a short bar hugging the top edge */}
            <span
                className={cn(
                    'absolute top-0 h-0.75 w-9 rounded-full bg-(--brand) transition-all duration-300',
                    active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0',
                )}
            />

            {/* Icon sits inside a pill that tints when the tab is active */}
            <span
                className={cn(
                    'relative flex items-center justify-center rounded-2xl px-5 py-1 transition-colors duration-300',
                    active ? 'bg-(--brand)/12 dark:bg-(--brand)/20' : 'bg-transparent',
                )}
            >
                {avatar && user ? (
                    <UserAvatar
                        src={user.profileImageUrl}
                        name={user.fullName}
                        className={cn(
                            'size-6 rounded-full text-[9px] object-cover transition-all duration-200',
                            active
                                ? 'ring-2 ring-(--brand) ring-offset-1 ring-offset-white dark:ring-offset-zinc-950'
                                : 'opacity-80 group-active:scale-90',
                        )}
                    />
                ) : (
                    <Icon
                        className={cn(
                            'size-6 transition-all duration-200',
                            active
                                ? 'text-(--brand) stroke-[2.25px]'
                                : 'text-zinc-500 stroke-[1.75px] group-active:scale-90 dark:text-zinc-400',
                        )}
                    />
                )}

                {/* Cart / notification badge */}
                {hydrated && badgeCount !== undefined && badgeCount > 0 && (
                    <span className="absolute -right-0.5 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-(--brand) px-1 text-[9px] font-bold tabular-nums text-white ring-2 ring-white dark:ring-zinc-950">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </span>

            {/* Label */}
            <span
                className={cn(
                    'max-w-full truncate px-1 text-[10px] leading-none tracking-tight transition-colors duration-200',
                    active
                        ? 'font-semibold text-(--brand)'
                        : 'font-medium text-zinc-500 dark:text-zinc-400',
                )}
            >
                {label}
            </span>
        </Link>
    );

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/85 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85 md:hidden">
            <div className="mx-auto flex h-16 max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
                {tab('/', tr(lang, 'navHome'), Home, isActive('/', true))}

                {tab(
                    '/account/wishlist',
                    tr(lang, 'savedItems'),
                    Heart,
                    isActive('/account/wishlist'),
                )}

                {tab(
                    '/checkout',
                    tr(lang, 'cart'),
                    ShoppingCart,
                    cartActive,
                    false,
                    itemCount,
                )}

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