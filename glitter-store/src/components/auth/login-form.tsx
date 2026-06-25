'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SocialAuth } from '@/components/auth/social-auth';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

const inputCls =
    'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20';

export function LoginForm({ lang }: { lang: Lang }) {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
        <div className="mx-auto max-w-md px-4 py-12">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'loginTitle')}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, 'loginSubtitle')}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'email')}
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'password')}
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputCls}
                        autoComplete="current-password"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-(--brand) px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
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
    );
}
