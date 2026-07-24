'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { SocialAuth } from '@/components/auth/social-auth';
import { AuthShell, authInputCls } from '@/components/auth/auth-shell';
import { useAuth } from '@/lib/auth';
import { isValidPhone } from '@/lib/phone';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

export function RegisterForm({
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
    const { register } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!fullName.trim()) return setError(tr(lang, 'nameRequired'));
        if (!email.trim()) return setError(tr(lang, 'emailRequired'));
        if (password.length < 8) return setError(tr(lang, 'passwordTooShort'));
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
        <AuthShell
            lang={lang}
            logoUrl={logoUrl}
            brandName={brandName}
            title={tr(lang, 'registerTitle')}
            subtitle={tr(lang, 'registerSubtitle')}
        >
            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'fullName')}
                    </label>
                    <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={authInputCls}
                            autoComplete="name"
                            placeholder="Sok Dara"
                        />
                    </div>
                </div>
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
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${authInputCls} pr-10`}
                            autoComplete="new-password"
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
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'phoneOptional')}
                    </label>
                    <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={authInputCls}
                            autoComplete="tel"
                            placeholder="0XX XXX XXX"
                        />
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand) px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60"
                >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
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
        </AuthShell>
    );
}
