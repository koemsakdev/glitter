'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth, type TelegramAuthData } from '@/lib/auth';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

declare global {
    interface Window {
        onTelegramAuth?: (user: TelegramAuthData) => void;
    }
}

export function TelegramLoginButton() {
    const { loginWithTelegram } = useAuth();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<(user: TelegramAuthData) => void>(() => {});

    handlerRef.current = async (user: TelegramAuthData) => {
        try {
            await loginWithTelegram(user);
            router.push('/account');
        } catch {
            // Surfaced by the page form; keep the widget silent.
        }
    };

    useEffect(() => {
        if (!BOT_USERNAME || !containerRef.current) return;
        window.onTelegramAuth = (user) => handlerRef.current(user);

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', BOT_USERNAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-radius', '12');

        const container = containerRef.current;
        container.appendChild(script);
        return () => {
            container.replaceChildren();
        };
    }, []);

    if (!BOT_USERNAME) return null;

    return <div ref={containerRef} className="flex justify-center" />;
}
