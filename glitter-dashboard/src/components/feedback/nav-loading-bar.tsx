'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const noop = () => () => {};

/**
 * A soft, thin (2px) progress bar pinned to the very top of the viewport.
 * It shows only while the user is actually waiting — a page loading data it
 * doesn't have yet, or a save in progress. Quiet background refreshes (polling,
 * live updates) don't flash it. Portaled to <body> so no transformed ancestor
 * can re-anchor its `position: fixed`.
 */
export function NavLoadingBar() {
    const firstLoads = useIsFetching({
        predicate: (q) => q.state.data === undefined,
    });
    const saving = useIsMutating();
    // True only in the browser (portals need document.body).
    const mounted = useSyncExternalStore(
        noop,
        () => true,
        () => false,
    );

    if (!mounted || firstLoads + saving === 0) return null;

    return createPortal(
        <div className="fixed inset-x-0 top-0 z-9999 h-0.5 overflow-hidden">
            <span className="nav-progress-bar-soft" />
        </div>,
        document.body,
    );
}
