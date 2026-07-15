'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Toggles global chrome (header / footer) per route. On focused flows like
 * checkout we hide the store header + footer on mobile so the page reads like a
 * native app screen, while keeping them on wider screens.
 *
 * Uses CSS (`display: contents | none`) rather than conditional mounting so the
 * children stay in the tree — no remount, no layout jump on navigation.
 */
export function RouteChrome({
    hideOn,
    mobileOnly = false,
    children,
}: {
    /** Route prefixes where the chrome should be hidden. */
    hideOn: string[];
    /** Hide only below `md` (keep on desktop). */
    mobileOnly?: boolean;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const match = hideOn.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`),
    );
    const cls = match
        ? mobileOnly
            ? 'hidden md:contents'
            : 'hidden'
        : 'contents';
    return <div className={cls}>{children}</div>;
}
