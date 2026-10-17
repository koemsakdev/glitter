'use client';

import { createPortal } from 'react-dom';
import { CircleCheck, Loader2 } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';

export type SignInPhase = 'idle' | 'signing' | 'done';

/**
 * Full-screen feedback while a sign-in completes: a spinner while we talk to
 * the API, then a "You're signed in" confirmation until the account page
 * replaces the login screen. Without it the login form just sits there.
 */
export function SignInOverlay({
    lang,
    phase,
}: {
    lang: Lang;
    phase: SignInPhase;
}) {
    if (phase === 'idle' || typeof document === 'undefined') return null;
    const done = phase === 'done';

    return createPortal(
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-9999 flex items-center justify-center bg-white/70 px-4 backdrop-blur-sm dark:bg-zinc-950/70"
        >
            <div className="flex w-full max-w-xs flex-col items-center rounded-3xl border border-zinc-100 bg-white px-6 py-8 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <span
                    className={`flex size-14 items-center justify-center rounded-full transition-colors ${
                        done
                            ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
                            : 'bg-(--brand)/10 text-(--brand)'
                    }`}
                >
                    {done ? (
                        <CircleCheck className="size-8" />
                    ) : (
                        <Loader2 className="size-7 animate-spin" />
                    )}
                </span>
                <p className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, done ? 'signedIn' : 'signingIn')}
                </p>
                {done && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="size-3.5 animate-spin" />
                        {tr(lang, 'takingToAccount')}
                    </p>
                )}
            </div>
        </div>,
        document.body,
    );
}
