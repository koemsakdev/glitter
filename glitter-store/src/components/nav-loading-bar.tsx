'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Top navigation progress bar. Rendered via a portal into <body> so it sits at
 * the very top of the viewport — NOT trapped inside PageTransition's
 * transformed container (a CSS `transform` ancestor re-anchors `position:fixed`,
 * which would otherwise pin the bar below the navbar).
 */
export function NavLoadingBar() {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-x-0 top-0 z-9999 h-1 overflow-hidden">
            <span className="nav-progress-bar" />
        </div>,
        document.body,
    );
}
