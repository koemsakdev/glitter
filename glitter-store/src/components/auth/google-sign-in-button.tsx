'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';
import {
    authSocialBtnCls,
    authSocialCompactBtnCls,
} from '@/components/auth/auth-shell';
import {
    SignInOverlay,
    type SignInPhase,
} from '@/components/auth/sign-in-overlay';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// GIS must be initialized once; the callback routes to the most recently
// mounted button's handler.
let gsiInitialized = false;
let activeHandler: ((credential: string) => void) | null = null;

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize(config: {
                        client_id: string;
                        callback: (resp: { credential: string }) => void;
                        auto_select?: boolean;
                        ux_mode?: 'popup' | 'redirect';
                        use_fedcm_for_prompt?: boolean;
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
 * Google Sign-In button, rendered by Google Identity Services (GIS).
 *
 * It MUST stay visible: Google's button iframe checks that it is actually
 * shown (anti-clickjacking) and ignores clicks when hidden — an invisible GIS
 * button layered over a custom one silently does nothing in production. So we
 * show the official button, themed to match (light/dark, full width), with a
 * same-sized placeholder while the script loads.
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

    // Follow the site's light/dark theme so the button matches the form.
    useEffect(() => {
        const update = () =>
            setIsDark(document.documentElement.classList.contains('dark'));
        update();
        const obs = new MutationObserver(update);
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => obs.disconnect();
    }, []);
    const [authError, setAuthError] = useState<string | null>(null);
    const [phase, setPhase] = useState<SignInPhase>('idle');

    // Warm the account route so the redirect after sign-in is instant.
    useEffect(() => {
        if (mode === 'login') router.prefetch('/account');
    }, [mode, router]);

    // Keep the latest handler so the GIS callback always uses fresh closures.
    useEffect(() => {
        handlerRef.current = async (credential: string) => {
            try {
                setAuthError(null);
                if (mode === 'link') {
                    await linkProvider('google', { idToken: credential });
                } else {
                    // Acknowledge immediately — the API round-trip + route
                    // change otherwise leave the login form looking idle.
                    setPhase('signing');
                    await loginWithGoogle(credential);
                    setPhase('done');
                    router.replace('/account');
                }
            } catch (e) {
                setPhase('idle');
                const msg =
                    e instanceof Error ? e.message : 'Google sign-in failed';
                setAuthError(msg);
                onError?.(msg);
            }
        };
    });

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;

        function init() {
            if (cancelled || !window.google || !gsiRef.current) return;
            try {
                // Clear any stale children before rendering fresh button
                gsiRef.current.replaceChildren();

                // Initialize GIS only once per page load. Re-initializing on
                // every theme/lang change breaks the button's click handler.
                if (!gsiInitialized) {
                    window.google.accounts.id.initialize({
                        client_id: CLIENT_ID as string,
                        callback: (resp) => activeHandler?.(resp.credential),
                        ux_mode: 'popup',
                        use_fedcm_for_prompt: false,
                    });
                    gsiInitialized = true;
                }
                activeHandler = (credential) => handlerRef.current(credential);

                // Full width of the form (GIS accepts 200–400px).
                const width = compact
                    ? 200
                    : Math.min(
                          400,
                          Math.max(200, gsiRef.current.offsetWidth || 320),
                      );
                window.google.accounts.id.renderButton(gsiRef.current, {
                    type: 'standard',
                    theme: isDark ? 'filled_black' : 'outline',
                    size: compact ? 'medium' : 'large',
                    text: compact ? 'signin' : 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    width,
                    locale: lang,
                });

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
        <div className={compact ? 'inline-flex flex-col' : 'w-full'}>
            <div
                className={
                    compact
                        ? 'relative inline-flex min-h-9 items-center'
                        : 'relative flex min-h-11 w-full items-center justify-center'
                }
            >
                {/* Official Google button — visible, so its clicks count. */}
                <div
                    ref={gsiRef}
                    className={`flex w-full justify-center transition-opacity ${
                        ready ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                {/* Same-sized placeholder while Google's script loads. */}
                {!ready && (
                    <div
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 ${
                            compact ? authSocialCompactBtnCls : authSocialBtnCls
                        } animate-pulse`}
                    >
                        <GoogleG small={compact} />
                        <span>
                            {tr(lang, compact ? 'connect' : 'continueWithGoogle')}
                        </span>
                    </div>
                )}
            </div>

            <SignInOverlay lang={lang} phase={phase} />

            {authError && !onError && (
                <p className="mt-2 text-center text-xs font-medium text-red-600 dark:text-red-400">
                    {authError}
                </p>
            )}
        </div>
    );
}

function GoogleG({ small = false }: { small?: boolean }) {
    return (
        <svg
            className={small ? 'size-4 shrink-0' : 'size-5 shrink-0'}
            viewBox="0 0 48 48"
            aria-hidden
        >
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
