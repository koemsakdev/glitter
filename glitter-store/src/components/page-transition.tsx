'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

// Module-level nav tracking (a single PageTransition instance lives in the
// layout). `popped` is flipped by the popstate listener just before a
// back/forward navigation changes the route.
let popped = false;

/**
 * Re-keys on route change so the incoming page animates in on every navigation.
 * A forward navigation (link/push) slides in from the right; a back/forward
 * gesture (popstate) slides in from the left — mirroring a native push/pop.
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [state, setState] = useState({
        path: pathname,
        dir: 'forward' as 'forward' | 'back',
    });

    useEffect(() => {
        const onPop = () => {
            popped = true;
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // Clear the pop flag once a navigation has been consumed.
    useEffect(() => {
        popped = false;
    }, [pathname]);

    // When the route changes, capture the direction from the pending pop flag.
    if (pathname !== state.path) {
        setState({ path: pathname, dir: popped ? 'back' : 'forward' });
    }

    return (
        <div
            key={state.path}
            className={state.dir === 'back' ? 'page-slide-back' : 'page-slide-forward'}
        >
            {children}
        </div>
    );
}
