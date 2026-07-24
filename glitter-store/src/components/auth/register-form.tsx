'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SocialAuth } from '@/components/auth/social-auth';
import { useAuth } from '@/lib/auth';
import { isValidPhone } from '@/lib/phone';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

const inputCls =
    'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20';

export function RegisterForm({ lang: initialLang }: { lang: Lang }) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const { register } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!fullName.trim()) return setError(tr(lang, 'nameRequired'));
        if (!email.trim()) return setError(tr(lang, 'emailRequired'));
        if (password.length < 8)
            return setError(tr(lang, 'passwordTooShort'));
        if (phone.trim() && !isValidPhone(phone))
            return setError(tr(lang, 'invalidPhone'));
        setSubmitting(true);
        try {
            await register({
                fullName: fullName.trim(),
                email: email.trim(),
                password,
                phoneNumber: phone.trim() || undefined,
            });
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
                {tr(lang, 'registerTitle')}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, 'registerSubtitle')}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'fullName')}
                    </label>
                    <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputCls}
                        autoComplete="name"
                    />
                </div>
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
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'phoneOptional')}
                    </label>
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                        autoComplete="tel"
                        placeholder="0XX XXX XXX"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-(--brand) px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                    {submitting
                        ? tr(lang, 'creatingAccount')
                        : tr(lang, 'register')}
                </button>
            </form>

            <SocialAuth lang={lang} />

            <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {tr(lang, 'haveAccount')}{' '}
                <Link
                    href="/account/login"
                    className="font-semibold text-(--brand) hover:underline"
                >
                    {tr(lang, 'login')}
                </Link>
            </p>
        </div>
    );
}
