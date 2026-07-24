'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';

/**
 * A small "Back" control for pages that aren't in the main nav (cart, checkout,
 * account, product detail…). By default it navigates UP to the page's logical
 * parent (`fallbackHref`), which is predictable — e.g. checkout always goes back
 * to the shop, not to whatever page you happened to arrive from.
 *
 * Pass `useHistory` for pages where returning to the exact previous page is
 * better (e.g. a product detail returning to the listing you scrolled); it falls
 * back to `fallbackHref` when there's no in-app history.
 */
export function BackLink({
    lang,
    fallbackHref = '/products',
    label,
    className = '',
    useHistory = false,
}: {
    lang: Lang;
    fallbackHref?: string;
    label?: string;
    className?: string;
    useHistory?: boolean;
}) {
    const router = useRouter();
    return (
        <button
            type="button"
            aria-label={label ?? tr(lang, 'back')}
            onClick={() => {
                if (
                    useHistory &&
                    typeof window !== 'undefined' &&
                    window.history.length > 1
                ) {
                    router.back();
                } else {
                    router.push(fallbackHref);
                }
            }}
            className={`group inline-flex items-center gap-2.5 ${className}`}
        >
            <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-sm transition-all duration-300 group-hover:border-transparent group-hover:text-white group-hover:shadow-lg group-hover:shadow-(--brand)/30 group-active:scale-90 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {/* brand fill grows from the centre on hover */}
                <span className="absolute inset-0 scale-0 rounded-full bg-(--brand) transition-transform duration-300 ease-out group-hover:scale-100" />
                <ChevronLeft className="relative size-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            </span>
            {label && (
                <span className="text-sm font-semibold text-zinc-600 transition-colors group-hover:text-(--brand) dark:text-zinc-300">
                    {label}
                </span>
            )}
        </button>
    );
}
