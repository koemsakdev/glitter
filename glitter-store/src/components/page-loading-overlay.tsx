'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A viewport-centred spinner shown during full-page (route) loading. Portaled to
 * <body> so it's fixed to the viewport — visible no matter where the user has
 * scrolled — and not trapped inside PageTransition's transformed container.
 */
export function PageLoadingOverlay() {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-9998 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/90 shadow-xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
                <span className="size-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-(--brand) dark:border-zinc-700 dark:border-t-(--brand)" />
            </span>
        </div>,
        document.body,
    );
}
