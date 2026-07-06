'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 10v10h14V10" />
        </svg>
    );
}
function ShopIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-1.5 5.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 4Z" />
            <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
        </svg>
    );
}
function CartIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.5 3h2l2.2 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6" />
        </svg>
    );
}
function UserIcon({ className }: IconProps) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
    );
}

const TABS = [
    { href: '/', key: 'home' as const, Icon: HomeIcon },
    { href: '/products', key: 'shop' as const, Icon: ShopIcon },
    { href: '/cart', key: 'cart' as const, Icon: CartIcon, badge: true },
    { href: '/account', key: 'account' as const, Icon: UserIcon },
];

export function MobileBottomNav({ lang }: { lang: Lang }) {
    const pathname = usePathname();
    const { itemCount, hydrated } = useCart();

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
            <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
                {TABS.map((tab) => {
                    const active =
                        tab.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(tab.href);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                                active
                                    ? 'text-(--brand)'
                                    : 'text-zinc-500 dark:text-zinc-400',
                            )}
                        >
                            <span className="relative">
                                <tab.Icon className="size-6" />
                                {tab.badge && hydrated && itemCount > 0 && (
                                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-bold text-white">
                                        {itemCount}
                                    </span>
                                )}
                            </span>
                            {tr(lang, tab.key)}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
