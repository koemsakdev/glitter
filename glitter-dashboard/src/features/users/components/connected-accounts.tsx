'use client';

import { Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import type { AuthProvider } from '@/types/user';

function GoogleLogo() {
    return (
        <svg viewBox="0 0 48 48" className="size-5">
            <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
        </svg>
    );
}

function FacebookLogo() {
    return (
        <svg viewBox="0 0 24 24" className="size-5" fill="#1877F2">
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
    );
}

function TelegramLogo() {
    return (
        <svg viewBox="0 0 24 24" className="size-5" fill="#229ED9">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.146.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.022c.242-.213-.054-.334-.373-.121L7.71 13.43l-2.96-.924c-.643-.204-.657-.643.136-.953l11.566-4.458c.537-.196 1.006.128.832.943z" />
        </svg>
    );
}

interface ProviderMeta {
    key: AuthProvider;
    label: string;
    icon: ReactNode;
    /** Icon-circle background. */
    tint: string;
}

const PROVIDERS: ProviderMeta[] = [
    {
        key: 'email',
        label: 'Email',
        icon: <Mail className="size-4.5 text-zinc-500" />,
        tint: 'bg-zinc-100 dark:bg-zinc-800',
    },
    {
        key: 'google',
        label: 'Google',
        icon: <GoogleLogo />,
        tint: 'bg-white ring-1 ring-zinc-200/70 dark:bg-zinc-100',
    },
    {
        key: 'facebook',
        label: 'Facebook',
        icon: <FacebookLogo />,
        tint: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
        key: 'telegram',
        label: 'Telegram',
        icon: <TelegramLogo />,
        tint: 'bg-sky-50 dark:bg-sky-500/10',
    },
];

interface ConnectedAccountsProps {
    linkedProviders?: AuthProvider[];
}

/**
 * Shows ONLY the sign-in methods the customer is actually linked with.
 * Unbound providers are hidden. Renders nothing when none are linked.
 */
export function ConnectedAccounts({ linkedProviders }: ConnectedAccountsProps) {
    const { t } = useI18n();
    const linked = new Set(linkedProviders ?? []);
    const shown = PROVIDERS.filter((p) => linked.has(p.key));

    if (shown.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shown.map((p) => (
                <div
                    key={p.key}
                    className="group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md dark:hover:border-pink-900"
                >
                    <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${p.tint}`}
                    >
                        {p.icon}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">
                            {p.label}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {t('user.accounts.connected')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
