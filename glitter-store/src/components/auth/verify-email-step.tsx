'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { authInputCls } from '@/components/auth/auth-shell';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

const RESEND_COOLDOWN = 60;

/**
 * Second step of email/password sign-up and sign-in for unverified accounts:
 * enter the 6-digit code that was emailed, which verifies + signs in.
 * Rendered inside AuthShell (the parent sets the title/subtitle).
 */
export function VerifyEmailStep({
    lang,
    email,
    onBack,
}: {
    lang: Lang;
    email: string;
    onBack: () => void;
}) {
    const router = useRouter();
    const { confirmEmail, resendEmailCode } = useAuth();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    // A code was just sent when this step opened.
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setNotice('');
        if (code.length !== 6) return setError(tr(lang, 'codeIncorrect'));
        setSubmitting(true);
        try {
            await confirmEmail(email, code);
            router.push('/account');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : tr(lang, 'codeIncorrect'),
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function resend() {
        setError('');
        setNotice('');
        setResending(true);
        try {
            await resendEmailCode(email);
            setNotice(tr(lang, 'codeResent'));
            setCooldown(RESEND_COOLDOWN);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : tr(lang, 'authFailed'),
            );
        } finally {
            setResending(false);
        }
    }

    return (
        <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {tr(lang, 'verificationCode')}
                </label>
                <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={code}
                        onChange={(e) =>
                            setCode(
                                e.target.value.replace(/\D/g, '').slice(0, 6),
                            )
                        }
                        className={`${authInputCls} font-semibold tracking-[0.5em]`}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder="••••••"
                    />
                </div>
            </div>

            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                </p>
            )}
            {notice && !error && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {notice}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand) px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
            >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting
                    ? tr(lang, 'verifying')
                    : tr(lang, 'verifyAndContinue')}
            </button>

            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, 'noCodeYet')}{' '}
                <button
                    type="button"
                    onClick={resend}
                    disabled={resending || cooldown > 0}
                    className="font-semibold text-(--brand) hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
                >
                    {tr(lang, 'resendCode')}
                    {cooldown > 0 && ` (${cooldown}s)`}
                </button>
            </p>
            <p className="text-center text-sm">
                <button
                    type="button"
                    onClick={onBack}
                    className="font-medium text-zinc-500 hover:text-(--brand) dark:text-zinc-400"
                >
                    {tr(lang, 'useDifferentEmail')}
                </button>
            </p>
        </form>
    );
}
