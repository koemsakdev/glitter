import type { ReactNode } from 'react';
import { BadgeCheck, Mail } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';
import type { AuthProvider } from '@/lib/auth';

/** One row of the "Connected accounts" list: provider icon · name · status. */
export function ProviderStatusRow({
    provider,
    label,
    connected,
    lang,
    onDisconnect,
    connectSlot,
}: {
    provider: AuthProvider;
    label: string;
    connected: boolean;
    lang: Lang;
    /** When provided (and connected), shows a Disconnect action. */
    onDisconnect?: () => void;
    /** Shown on the right when NOT connected (e.g. a compact Connect button). */
    connectSlot?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 px-5 py-3.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <ProviderIcon provider={provider} />
            </span>
            <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {label}
            </span>
            {connected ? (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <BadgeCheck className="size-3.5" />
                        {tr(lang, 'connected')}
                    </span>
                    {onDisconnect && (
                        <button
                            type="button"
                            onClick={onDisconnect}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                            {tr(lang, 'disconnect')}
                        </button>
                    )}
                </div>
            ) : connectSlot ? (
                connectSlot
            ) : (
                <span className="text-xs font-medium text-zinc-400">
                    {tr(lang, 'notConnected')}
                </span>
            )}
        </div>
    );
}

/** The brand mark for an auth provider (Google/Facebook/Telegram/Email). */
export function ProviderIcon({ provider }: { provider: AuthProvider }) {
    if (provider === 'email') return <Mail className="size-4 text-zinc-500" />;
    if (provider === 'facebook')
        return (
            <svg
                className="size-4 text-[#1877F2]"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
            </svg>
        );
    if (provider === 'telegram')
        return (
            <svg className="size-4 text-[#28A8E9]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.94 2.5A9.5 9.5 0 1 0 21.5 12 9.5 9.5 0 0 0 11.94 2.5zm4.38 6.53-1.46 6.9c-.11.49-.4.61-.81.38l-2.24-1.65-1.08 1.04c-.12.12-.22.22-.45.22l.16-2.28 4.15-3.75c.18-.16-.04-.25-.28-.09L9.2 13.2l-2.2-.69c-.48-.15-.49-.48.1-.71l8.6-3.32c.4-.15.75.09.62.55z" />
            </svg>
        );
    // google
    return (
        <svg className="size-4" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z" />
            <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z" />
            <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.14 35.09 26.72 36 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.5 39.56 16.23 44 24 44z" />
            <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3c-.79 2.24-2.23 4.16-4.09 5.56l6.19 5.24C39.9 36.7 44 31.5 44 24c0-1.34-.14-2.65-.39-3.92z" />
        </svg>
    );
}
