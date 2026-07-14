'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';

/**
 * A small "Back" control for pages that aren't in the main nav (cart, checkout,
 * account, product detail…). Goes back in history when possible, otherwise
 * falls back to a sensible link.
 */
export function BackLink({
    lang,
    fallbackHref = '/products',
    label,
    className = '',
}: {
    lang: Lang;
    fallbackHref?: string;
    label?: string;
    className?: string;
}) {
    const router = useRouter();
    return (
        <button
            type="button"
            onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                } else {
                    router.push(fallbackHref);
                }
            }}
            className={`group inline-flex items-center gap-2.5 ${className}`}
        >
            <span className="flex size-10 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-700 shadow-sm backdrop-blur transition-all group-hover:-translate-x-0.5 group-hover:border-(--brand)/40 group-hover:text-(--brand) group-hover:shadow-md group-active:scale-95 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
                <ChevronLeft className="size-5" />
            </span>
            <span className="text-sm font-semibold text-zinc-600 transition-colors group-hover:text-(--brand) dark:text-zinc-300">
                {label ?? tr(lang, 'back')}
            </span>
        </button>
    );
}
