/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

interface FBLoginResponse {
    authResponse: { accessToken: string } | null;
    status: string;
}
declare global {
    interface Window {
        FB?: {
            init(params: {
                appId: string;
                cookie?: boolean;
                xfbml?: boolean;
                version: string;
            }): void;
            login(
                cb: (resp: FBLoginResponse) => void,
                opts?: { scope?: string },
            ): void;
        };
        fbAsyncInit?: () => void;
    }
}

export function FacebookLoginButton({
    lang,
    mode = 'login',
    onError,
    compact = false,
}: {
    lang: Lang;
    mode?: 'login' | 'link';
    onError?: (message: string) => void;
    compact?: boolean;
}) {
    const { loginWithFacebook, linkProvider } = useAuth();
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!APP_ID) return;
        if (window.FB) {
            setReady(true);
            return;
        }
        const id = 'facebook-jssdk';
        if (document.getElementById(id)) return;

        window.fbAsyncInit = () => {
            window.FB?.init({
                appId: APP_ID as string,
                cookie: true,
                xfbml: false,
                version: 'v21.0',
            });
            setReady(true);
        };

        const script = document.createElement('script');
        script.id = id;
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    if (!APP_ID) return null;

    function handleClick() {
        window.FB?.login(
            (resp) => {
                const token = resp.authResponse?.accessToken;
                if (!token) return;
                if (mode === 'link') {
                    void linkProvider('facebook', { accessToken: token }).catch(
                        (e) =>
                            onError?.(
                                e instanceof Error
                                    ? e.message
                                    : 'Could not connect',
                            ),
                    );
                } else {
                    void loginWithFacebook(token)
                        .then(() => router.push('/account'))
                        .catch(() => {
                            // Surfaced by the page form; keep the button silent.
                        });
                }
            },
            { scope: 'email,public_profile' },
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={!ready}
            className={
                compact
                    ? 'flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                    : 'flex w-full items-center justify-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }
        >
            <svg
                className={`${compact ? 'size-4' : 'size-5'} text-[#1877F2]`}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
            </svg>
            {tr(lang, compact ? 'connect' : 'continueWithFacebook')}
        </button>
    );
}
