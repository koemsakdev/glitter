'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The page <main>. Normally reserves bottom space for the mobile tab bar
 * (`pb-20`), but on checkout — where the tab bar is hidden and the page has its
 * own fixed dock — that padding is dropped so there's no empty strip at the
 * bottom.
 */
export function MainArea({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isCheckout = pathname === '/checkout';
    return (
        <main
            className={`flex-1 max-lg:overflow-x-clip ${
                isCheckout ? '' : 'pb-20 lg:pb-0'
            }`}
        >
            {children}
        </main>
    );
}
