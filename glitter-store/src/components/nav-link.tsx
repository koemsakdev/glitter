'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A header nav link that highlights itself when its route is active. */
export function NavLink({
    href,
    children,
    target,
    rel,
}: {
    href: string;
    children: ReactNode;
    target?: string;
    rel?: string;
}) {
    const pathname = usePathname();
    const active =
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <Link
            href={href}
            target={target}
            rel={rel}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                    ? 'bg-(--brand)/15 text-(--brand)'
                    : 'text-zinc-600 hover:text-(--brand) dark:text-zinc-300',
            )}
        >
            {children}
        </Link>
    );
}
