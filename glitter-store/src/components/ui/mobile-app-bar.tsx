'use client';

import type { ReactNode } from 'react';
import { BackLink } from '@/components/ui/back-link';
import type { Lang } from '@/lib/locale';

/**
 * Native-app style top bar (mobile only): circular back button (left), centred
 * title, and an optional action on the right. Sticky to the top of the screen;
 * hidden on desktop where pages keep the global store header + wider layout.
 */
export function MobileAppBar({
    lang,
    title,
    fallbackHref,
    useHistory,
    action,
}: {
    lang: Lang;
    title: string;
    fallbackHref?: string;
    useHistory?: boolean;
    action?: ReactNode;
}) {
    return (
        <div className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-zinc-100/80 bg-white/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-xl md:hidden dark:border-zinc-800/80 dark:bg-zinc-950/85">
            <BackLink lang={lang} fallbackHref={fallbackHref} useHistory={useHistory} />
            <h1 className="pointer-events-none absolute left-1/2 max-w-[52%] -translate-x-1/2 truncate text-center text-base font-bold text-zinc-900 dark:text-zinc-50">
                {title}
            </h1>
            {/* Reserve the right slot so the title stays centred even with no action. */}
            <span className="flex size-11 items-center justify-end">{action}</span>
        </div>
    );
}
