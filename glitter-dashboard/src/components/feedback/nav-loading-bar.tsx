'use client';

import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A soft, thin (2px) progress bar pinned to the very top of the viewport,
 * shown whenever any React Query request is in flight — so navigating/loading
 * data gives instant feedback. Portaled to <body> so no transformed ancestor
 * can re-anchor its `position: fixed`.
 */
export function NavLoadingBar() {
    const isFetching = useIsFetching();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || isFetching === 0) return null;

    return createPortal(
        <div className="fixed inset-x-0 top-0 z-9999 h-0.5 overflow-hidden">
            <span className="nav-progress-bar-soft" />
        </div>,
        document.body,
    );
}
