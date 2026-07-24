'use client';

import type { ReactNode } from 'react';
import type { Lang } from '@/lib/locale';

/** Shared frame for the login & register screens — a centred card with the
 *  store logo and decorative brand glow. No in-form back button: on desktop the
 *  top navbar handles navigation, and on mobile the native MobileHeader shows a
 *  back button — so an extra one here would just be clutter. */
export function AuthShell({
    logoUrl,
    brandName,
    title,
    subtitle,
    children,
}: {
    lang?: Lang;
    logoUrl?: string | null;
    brandName?: string;
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <div className="relative mx-auto flex min-h-[80vh] w-full max-w-lg flex-col justify-center px-4 py-8 sm:py-12">
            {/* Decorative brand glow */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-24 top-6 size-64 rounded-full bg-(--brand)/10 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-24 bottom-6 size-64 rounded-full bg-(--brand)/10 blur-3xl"
            />

            <div className="relative rounded-3xl border border-zinc-100 bg-white/95 p-6 shadow-xl shadow-zinc-200/50 backdrop-blur-sm sm:p-8 md:p-10 dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-none">
                <div className="text-center">
                    {/* Store logo (falls back to the brand initial) */}
                    <span className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-(--brand)/10 ring-1 ring-(--brand)/15">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt={brandName ?? ''}
                                className="size-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl font-black text-(--brand)">
                                {(brandName ?? 'G').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </p>
                </div>

                {children}
            </div>
        </div>
    );
}

/** Shared input styling for the auth forms (leading icon, brand focus ring). */
export const authInputCls =
    'h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500';
