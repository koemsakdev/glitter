'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { SocialAuth } from '@/components/auth/social-auth';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

const inputCls =
    'h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

export function LoginForm({ lang: initialLang }: { lang: Lang }) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!email.trim()) return setError(tr(lang, 'emailRequired'));
        if (!password) return setError(tr(lang, 'passwordRequired'));
        setSubmitting(true);
        try {
            await login(email.trim(), password);
            router.push('/account');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : tr(lang, 'authFailed'),
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto flex min-h-[78vh] max-w-md flex-col justify-center px-4 py-10">
            <BackLink lang={lang} fallbackHref="/" className="mb-4 max-md:hidden" />

            <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:p-8">
                {/* Header */}
                <div className="text-center">
                    <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-(--brand)/10 text-(--brand)">
                        <Sparkles className="size-7" />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'loginTitle')}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'loginSubtitle')}
                    </p>
                </div>

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {tr(lang, 'email')}
                        </label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputCls}
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
                            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${inputCls} pr-10`}
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                aria-label={tr(
                                    lang,
                                    showPw ? 'hidePassword' : 'showPassword',
                                )}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition-colors hover:text-(--brand)"
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand) px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {submitting && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {submitting ? tr(lang, 'loggingIn') : tr(lang, 'login')}
                    </button>
                </form>

                <SocialAuth lang={lang} />

                <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'noAccount')}{' '}
                    <Link
                        href="/account/register"
                        className="font-semibold text-(--brand) hover:underline"
                    >
                        {tr(lang, 'register')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
