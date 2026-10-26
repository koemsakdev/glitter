'use client';

import type { ReactNode } from 'react';

/**
 * The page <main>. No bottom padding of its own: on phones the footer strip
 * right below it already leaves room for the fixed tab bar, and checkout /
 * product detail manage their own fixed bottom bars.
 */
export function MainArea({ children }: { children: ReactNode }) {
    return (
        <main className="flex-1 max-md:overflow-x-clip">
            {children}
        </main>
    );
}
