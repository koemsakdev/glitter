'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize(config: {
                        client_id: string;
                        callback: (resp: { credential: string }) => void;
                        auto_select?: boolean;
                    }): void;
                    renderButton(
                        parent: HTMLElement,
                        options: Record<string, unknown>,
                    ): void;
                    prompt(
                        momentListener?: (notification: unknown) => void,
                    ): void;
                    disableAutoSelect(): void;
                };
            };
        };
    }
}

/**
 * Google Sign-In button rendered directly via Google Identity Services (GIS).
 *
 * Renders the official Google button to ensure secure ID-token issuance,
 * proper click handling (avoiding cross-origin iframe click blocking),
 * native Khmer and English localization, and automatic dark/light theme switching.
 */
export function GoogleSignInButton({
    lang,
    mode = 'login',
    onError,
    compact = false,
}: {
    lang: Lang;
    /** 'link' connects Google to the current account instead of signing in. */
    mode?: 'login' | 'link';
    onError?: (message: string) => void;
    /** Small inline pill ("Connect") for the connected-accounts rows. */
    compact?: boolean;
}) {
    const { loginWithGoogle, linkProvider } = useAuth();
    const router = useRouter();
    const gsiRef = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<(credential: string) => void>(() => {});
    const [ready, setReady] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Keep the latest handler so the GIS callback always uses fresh closures.
    handlerRef.current = async (credential: string) => {
        try {
            setAuthError(null);
            if (mode === 'link') {
                await linkProvider('google', { idToken: credential });
            } else {
                await loginWithGoogle(credential);
                router.push('/account');
            }
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Google sign-in failed';
            setAuthError(msg);
            onError?.(msg);
        }
    };

    // Track dark mode dynamically so Google button adapts on theme change
    useEffect(() => {
        const updateDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        updateDark();
        const obs = new MutationObserver(updateDark);
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;

        function init() {
            if (cancelled || !window.google || !gsiRef.current) return;
            try {
                // Clear any stale children before rendering fresh button
                gsiRef.current.replaceChildren();

                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID as string,
                    callback: (resp) => handlerRef.current(resp.credential),
                });

                window.google.accounts.id.renderButton(gsiRef.current, {
                    type: 'standard',
                    theme: isDark ? 'filled_black' : 'outline',
                    size: compact ? 'medium' : 'large',
                    text: 'continue_with',
                    shape: 'pill',
                    logo_alignment: 'left',
                    width: compact ? 200 : 320,
                    locale: lang,
                });

                if (mode === 'login') {
                    window.google.accounts.id.prompt();
                }

                setReady(true);
            } catch (err) {
                console.error('Google Sign-In initialization failed:', err);
            }
        }

        if (window.google) {
            init();
            return;
        }

        const id = 'google-gsi-script';
        let script = document.getElementById(id) as HTMLScriptElement | null;
        if (!script) {
            script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.id = id;
            document.body.appendChild(script);
        }

        const onLoad = () => init();
        script.addEventListener('load', onLoad);
        return () => {
            cancelled = true;
            script?.removeEventListener('load', onLoad);
        };
    }, [lang, compact, mode, isDark]);

    if (!CLIENT_ID) return null;

    return (
        <div className="flex flex-col items-center justify-center">
            {/* Real rendered Google button */}
            <div
                ref={gsiRef}
                className={
                    ready
                        ? 'flex justify-center'
                        : 'hidden'
                }
            />

            {/* Skeleton / placeholder while loading GIS script */}
            {!ready && (
                <div
                    className={
                        compact
                            ? 'flex h-9 w-[200px] items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                            : 'flex h-10 w-[320px] items-center justify-center gap-2.5 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                    }
                >
                    <GoogleG />
                    <span>
                        {tr(lang, compact ? 'connect' : 'continueWithGoogle')}
                    </span>
                </div>
            )}

            {authError && !onError && (
                <p className="mt-2 text-center text-xs font-medium text-red-600 dark:text-red-400">
                    {authError}
                </p>
            )}
        </div>
    );
}

function GoogleG() {
    return (
        <svg className="size-5 shrink-0" viewBox="0 0 48 48" aria-hidden>
            <path
                fill="#FFC107"
                d="M43.61 20.08H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z"
            />
            <path
                fill="#FF3D00"
                d="M6.31 14.69l6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z"
            />
            <path
                fill="#4CAF50"
                d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.14 35.09 26.72 36 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.5 39.56 16.23 44 24 44z"
            />
            <path
                fill="#1976D2"
                d="M43.61 20.08H42V20H24v8h11.3c-.79 2.24-2.23 4.16-4.09 5.56l6.19 5.24C39.9 36.7 44 31.5 44 24c0-1.34-.14-2.65-.39-3.92z"
            />
        </svg>
    );
}
