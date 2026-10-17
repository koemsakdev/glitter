'use client';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { tr, type Lang } from '@/lib/locale';

// Telegram sign-in is disabled for now — only Google + email/password.
const HAS_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export function SocialAuth({
    lang,
    onError,
}: {
    lang: Lang;
    onError?: (message: string) => void;
}) {
    if (!HAS_GOOGLE) return null;

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                {tr(lang, 'orContinueWith')}
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <GoogleSignInButton lang={lang} onError={onError} />
        </div>
    );
}
