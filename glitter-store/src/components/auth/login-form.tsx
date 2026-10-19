'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { SocialAuth } from '@/components/auth/social-auth';
import {
    AuthShell,
    authInputCls,
    authPrimaryBtnCls,
} from '@/components/auth/auth-shell';
import { VerifyEmailStep } from '@/components/auth/verify-email-step';
import {
    SignInOverlay,
    type SignInPhase,
} from '@/components/auth/sign-in-overlay';
import { EmailNotVerifiedError, useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

export function LoginForm({
    lang: initialLang,
    logoUrl,
    brandName,
}: {
    lang: Lang;
    logoUrl?: string | null;
    brandName?: string;
}) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const { login, user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    /** Set once a code was emailed — switches to the verify step. */
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);
    const [phase, setPhase] = useState<SignInPhase>('idle');

    useEffect(() => {
        router.prefetch('/account');
    }, [router]);

    // Already signed in (e.g. back button / returning visitor) → account.
    useEffect(() => {
        if (!loading && user) router.replace('/account');
    }, [loading, user, router]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!email.trim()) return setError(tr(lang, 'emailRequired'));
        if (!password) return setError(tr(lang, 'passwordRequired'));
        setSubmitting(true);
        try {
            await login(email.trim(), password);
            setPhase('done');
            router.replace('/account');
        } catch (err) {
            if (err instanceof EmailNotVerifiedError) {
                setPendingEmail(err.email);
                return;
            }
            setError(
                err instanceof Error ? err.message : tr(lang, 'authFailed'),
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            lang={lang}
            logoUrl={logoUrl}
            brandName={brandName}
            title={
                pendingEmail ? tr(lang, 'verifyEmail') : tr(lang, 'loginTitle')
            }
            subtitle={
                pendingEmail
                    ? tr(lang, 'codeSentTo').replace('{email}', pendingEmail)
                    : tr(lang, 'loginSubtitle')
            }
        >
            {pendingEmail ? (
                <VerifyEmailStep
                    lang={lang}
                    email={pendingEmail}
                    onBack={() => setPendingEmail(null)}
                />
            ) : (
                <>
                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {tr(lang, 'email')}
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={authInputCls}
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {tr(lang, 'password')}
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className={`${authInputCls} pr-10`}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    aria-label={tr(
                                        lang,
                                        showPw
                                            ? 'hidePassword'
                                            : 'showPassword',
                                    )}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition-colors hover:text-(--brand)"
                                >
                                    {showPw ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className={authPrimaryBtnCls}
                        >
                            {submitting && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {submitting
                                ? tr(lang, 'loggingIn')
                                : tr(lang, 'login')}
                        </button>
                    </form>

                    <SocialAuth lang={lang} onError={setError} />

                    <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'noAccount')}{' '}
                        <Link
                            href="/account/register"
                            className="font-semibold text-(--brand) hover:underline"
                        >
                            {tr(lang, 'register')}
                        </Link>
                    </p>
                </>
            )}
            <SignInOverlay lang={lang} phase={phase} />
        </AuthShell>
    );
}
