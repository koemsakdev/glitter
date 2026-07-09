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

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    const cartActive = pathname === '/cart';

    const tab = (
        href: string,
        label: string,
        Icon: typeof Home,
        active: boolean,
        avatar?: boolean,
        badgeCount?: number
    ) => (
        <Link
            href={href}
            className="relative flex flex-1 flex-col items-center justify-between h-full pt-2.5 pb-1 transition-all"
        >
            {/* Visual Icon Container */}
            <div className="relative flex items-center justify-center size-6">
                {avatar && user ? (
                    <UserAvatar
                        src={user.profileImageUrl}
                        name={user.fullName}
                        className={cn(
                            'size-5.5 rounded-full text-[9px] transition-transform duration-200 object-cover',
                            active ? 'ring-2 ring-(--brand) scale-105' : 'opacity-80'
                        )}
                    />
                ) : (
                    <Icon 
                        className={cn(
                            "size-5.5 transition-all duration-200", 
                            active 
                                ? "text-(--brand) stroke-[2.25px] scale-105" 
                                : "text-zinc-500 dark:text-zinc-400 stroke-[1.75px]"
                        )} 
                    />
                )}

                {/* Inline Minimalist Notification/Cart Badges using System Colors */}
                {hydrated && badgeCount !== undefined && badgeCount > 0 && (
                    <span className={cn(
                        "absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full text-[9px] font-bold px-1 tabular-nums transition-colors duration-300 ring-2 ring-white dark:ring-zinc-950",
                        active 
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950" 
                            : "bg-(--brand) text-white"
                    )}>
                        {badgeCount}
                    </span>
                )}
            </div>
            
            {/* Typography & Active Dot matching the System Theme */}
            <div className="flex flex-col items-center gap-0.5 w-full mt-1">
                <span className={cn(
                    "text-[10px] font-medium tracking-tight transition-colors duration-200 truncate px-1 max-w-full leading-none",
                    active 
                        ? "text-(--brand)" 
                        : "text-zinc-500 dark:text-zinc-400"
                )}>
                    {label}
                </span>
                
                {/* Active dot styled with System Brand Color */}
                <span className={cn(
                    "size-1 rounded-full bg-(--brand) transition-all duration-300",
                    active ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )} />
            </div>
        </Link>
    );

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
            <div className="mx-auto flex max-w-md items-stretch justify-between px-2 h-16 pb-[env(safe-area-inset-bottom)]">
                
                {tab('/', tr(lang, 'navHome'), Home, isActive('/', true))}
                
                {tab(
                    '/account/wishlist',
                    tr(lang, 'savedItems'),
                    Heart,
                    isActive('/account/wishlist'),
                )}

                {/* Seamless Inline Cart Tab matching the updated system styling rules */}
                {tab(
                    '/cart', 
                    tr(lang, 'cart'), 
                    ShoppingCart, 
                    cartActive,
                    false,
                    itemCount
                )}

                {tab('/stores', tr(lang, 'navLocation'), MapPin, isActive('/stores'))}
                
                {tab(
                    user ? '/account' : '/account/login',
                    tr(lang, 'profile'),
                    User,
                    isActive('/account', true) || pathname === '/account/login',
                    true
                )}
                
            </div>
        </nav>
    );
}