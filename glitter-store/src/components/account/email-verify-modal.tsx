/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MailCheck, X } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

/** Bottom-sheet / dialog to verify the account email with a 6-digit code. */
export function EmailVerifyModal({
    lang,
    email,
    open,
    onClose,
    onVerified,
}: {
    lang: Lang;
    email: string;
    open: boolean;
    onClose: () => void;
    onVerified: () => void;
}) {
    const { authFetch } = useAuth();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const sentOnce = useRef(false);

    async function sendCode() {
        setError('');
        setBusy(true);
        try {
            const r = await authFetch('/api/auth/email/send-code', {
                method: 'POST',
            });
            if (!r.ok) {
                const d = (await r.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(d?.message || tr(lang, 'updateFailed'));
            }
            setCooldown(60);
        } catch (e) {
            setError(e instanceof Error ? e.message : tr(lang, 'updateFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function verify() {
        setError('');
        setBusy(true);
        try {
            const r = await authFetch('/api/auth/email/verify', {
                method: 'POST',
                body: JSON.stringify({ code: code.trim() }),
            });
            if (!r.ok) {
                const d = (await r.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(d?.message || tr(lang, 'codeIncorrect'));
            }
            onVerified();
        } catch (e) {
            setError(e instanceof Error ? e.message : tr(lang, 'codeIncorrect'));
        } finally {
            setBusy(false);
        }
    }

    // Auto-send a code the first time the modal opens; reset when it closes.
    useEffect(() => {
        if (open && !sentOnce.current) {
            sentOnce.current = true;
            void sendCode();
        }
        if (!open) {
            sentOnce.current = false;
            setCode('');
            setError('');
            setCooldown(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Resend cooldown tick.
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(o) => !o && onClose()}
            title={tr(lang, 'verifyEmail')}
            className="md:max-w-sm"
        >
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-(--brand)/10 text-(--brand)">
                        <MailCheck className="size-5" />
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={tr(lang, 'close')}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'verifyEmail')}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'verifyEmailHint')}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {email}
                </p>

                <input
                    value={code}
                    onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="mt-4 w-full rounded-xl border border-zinc-200 bg-white py-3 text-center text-2xl font-extrabold tracking-[0.4em] text-zinc-900 outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />

                {error && (
                    <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={verify}
                    disabled={busy || code.length < 4}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand) py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {tr(lang, 'verify')}
                </button>

                <button
                    type="button"
                    onClick={sendCode}
                    disabled={busy || cooldown > 0}
                    className="mt-2.5 w-full text-center text-xs font-medium text-zinc-500 hover:text-(--brand) disabled:opacity-60 dark:text-zinc-400"
                >
                    {cooldown > 0
                        ? `${tr(lang, 'resendCode')} (${cooldown}s)`
                        : tr(lang, 'resendCode')}
                </button>
            </div>
        </ResponsiveModal>
    );
}
