'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth, type TelegramAuthData } from '@/lib/auth';
import {
    authSocialBtnCls,
    authSocialCompactBtnCls,
} from '@/components/auth/auth-shell';

const BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
const SCRIPT_ID = 'telegram-widget-script';
const SCRIPT_SRC = 'https://telegram.org/js/telegram-widget.js?22';

declare global {
    interface Window {
        onTelegramAuth?: (user: TelegramAuthData) => void;
        Telegram?: {
            Login?: {
                auth(
                    options: { bot_id: string; request_access?: 'write' },
                    callback: (user: TelegramAuthData | false) => void,
                ): void;
            };
        };
    }
}

/** Loads telegram-widget.js once and resolves when `Telegram.Login` exists. */
function loadTelegramScript(): Promise<void> {
    if (window.Telegram?.Login) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (!script) {
            script = document.createElement('script');
            script.id = SCRIPT_ID;
            script.src = SCRIPT_SRC;
            script.async = true;
            document.body.appendChild(script);
        }
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener('error', () => reject(new Error('Could not load Telegram')), { once: true });
    });
}

export function TelegramLoginButton({
    mode = 'login',
    onError,
    compact = false,
    label,
}: {
    mode?: 'login' | 'link';
    onError?: (message: string) => void;
    compact?: boolean;
    /** Button text; defaults to "Continue with Telegram" / "Connect". */
    label?: string;
} = {}) {
    const { loginWithTelegram, linkProvider } = useAuth();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<(user: TelegramAuthData) => void>(() => {});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        handlerRef.current = async (user: TelegramAuthData) => {
            try {
                if (mode === 'link') {
                    await linkProvider(
                        'telegram',
                        user as unknown as Record<string, unknown>,
                    );
                } else {
                    await loginWithTelegram(user);
                    router.push('/account');
                }
            } catch (e) {
                onError?.(
                    e instanceof Error
                        ? e.message
                        : mode === 'link'
                          ? 'Could not connect'
                          : 'Telegram sign-in failed',
                );
            }
        };
    });

    // Preload the script so the popup opens immediately on click.
    useEffect(() => {
        if (BOT_ID) loadTelegramScript().catch(() => {});
    }, []);

    // Fallback: no bot id configured → Telegram's own (unstyled) widget.
    useEffect(() => {
        if (BOT_ID || !BOT_USERNAME || !containerRef.current) return;
        window.onTelegramAuth = (user) => handlerRef.current(user);

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.setAttribute('data-telegram-login', BOT_USERNAME);
        script.setAttribute('data-size', compact ? 'medium' : 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-radius', '12');

        const container = containerRef.current;
        container.appendChild(script);
        return () => {
            container.replaceChildren();
        };
    }, [compact]);

    async function handleClick() {
        if (!BOT_ID) return;
        setBusy(true);
        try {
            await loadTelegramScript();
            window.Telegram?.Login?.auth(
                { bot_id: BOT_ID, request_access: 'write' },
                async (user) => {
                    if (user) await handlerRef.current(user);
                    setBusy(false);
                },
            );
        } catch (e) {
            setBusy(false);
            onError?.(e instanceof Error ? e.message : 'Could not load Telegram');
        }
    }

    if (!BOT_ID) {
        if (!BOT_USERNAME) return null;
        return <div ref={containerRef} className="flex justify-center" />;
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={busy}
            className={compact ? authSocialCompactBtnCls : authSocialBtnCls}
        >
            {busy ? (
                <Loader2
                    className={`${compact ? 'size-4' : 'size-5'} animate-spin text-[#229ED9]`}
                />
            ) : (
                <TelegramIcon small={compact} />
            )}
            <span>
                {label ?? (compact ? 'Connect' : 'Continue with Telegram')}
            </span>
        </button>
    );
}

function TelegramIcon({ small = false }: { small?: boolean }) {
    return (
        <svg
            className={small ? 'size-4 shrink-0' : 'size-5 shrink-0'}
            viewBox="0 0 24 24"
            aria-hidden
        >
            <circle cx="12" cy="12" r="12" fill="#229ED9" />
            <path
                fill="#fff"
                d="M5.43 11.87l11.57-4.46c.54-.2 1.01.13.83.94l-1.97 9.28c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.4c-.16.16-.3.29-.6.29l.21-3.05 5.56-5.02c.24-.21-.05-.33-.38-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.15-.97z"
            />
        </svg>
    );
}
