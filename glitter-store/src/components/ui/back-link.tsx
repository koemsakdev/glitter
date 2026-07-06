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
            className={`group inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-(--brand) dark:text-zinc-400 ${className}`}
        >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {label ?? tr(lang, 'back')}
        </button>
    );
}
