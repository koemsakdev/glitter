'use client';

import { FacebookLoginButton } from '@/components/auth/facebook-login-button';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { TelegramLoginButton } from '@/components/auth/telegram-login-button';
import { tr, type Lang } from '@/lib/locale';

const HAS_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const HAS_TELEGRAM = Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);
const HAS_FACEBOOK = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);

export function SocialAuth({ lang }: { lang: Lang }) {
    if (!HAS_GOOGLE && !HAS_TELEGRAM && !HAS_FACEBOOK) return null;

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200" />
                {tr(lang, 'orContinueWith')}
                <span className="h-px flex-1 bg-zinc-200" />
            </div>
            <GoogleSignInButton />
            <FacebookLoginButton lang={lang} />
            <TelegramLoginButton />
        </div>
    );
}
