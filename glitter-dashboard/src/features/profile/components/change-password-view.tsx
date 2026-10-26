'use client';

import {
    ArrowLeft,
    CircleAlert,
    CircleCheck,
    Eye,
    EyeOff,
    History,
    KeyRound,
    Loader2,
    Lock,
    LogOut,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    isStrongPassword,
    PasswordStrength,
} from '@/components/ui/password-strength';
import { useChangePassword } from '@/features/profile/use-profile';
import { useLogout } from '@/features/auth/use-auth';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const inputClass =
    'h-11 rounded-xl shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-700';

export function ChangePasswordView() {
    const { t } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const changePassword = useChangePassword();
    const logout = useLogout();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    async function handleSubmit() {
        if (!currentPassword) {
            toast({
                title: t('common.toast.error'),
                description: t('changePassword.validation.currentRequired'),
                variant: 'destructive',
            });
            return;
        }
        if (!isStrongPassword(newPassword)) {
            toast({
                title: t('common.toast.error'),
                description: t('password.notStrong'),
                variant: 'destructive',
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({
                title: t('common.toast.error'),
                description: t('changePassword.validation.mismatch'),
                variant: 'destructive',
            });
            return;
        }

        try {
            await changePassword.mutateAsync({ currentPassword, newPassword });
            toast({
                title: t('changePassword.success'),
                description: t('changePassword.successHelp'),
                variant: 'success',
                important: true,
            });
            // Backend invalidates all tokens — force re-login.
            await logout.mutateAsync();
            router.replace('/login');
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    const confirmTouched = confirmPassword.length > 0;
    const matches = confirmTouched && confirmPassword === newPassword;
    const canSubmit =
        currentPassword.length > 0 &&
        isStrongPassword(newPassword) &&
        confirmPassword === newPassword &&
        !changePassword.isPending;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="space-y-6"
        >
            {/* Header — same pattern as other pages */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('changePassword.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('changePassword.subtitle')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="sm:shrink-0"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="size-4" />
                    {t('common.back')}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* ── Left: what to know ── */}
                <aside className="space-y-6 lg:order-first">
                    <section className="rounded-xl border bg-card p-6">
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <ShieldCheck className="size-4" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold">
                                    {t('changePassword.info.title')}
                                </h2>
                                <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <LogOut className="mt-0.5 size-4 shrink-0" />
                                        {t('changePassword.info.signOut')}
                                    </li>
                                    <li className="flex gap-2">
                                        <KeyRound className="mt-0.5 size-4 shrink-0" />
                                        {t('changePassword.info.unique')}
                                    </li>
                                    <li className="flex gap-2">
                                        <History className="mt-0.5 size-4 shrink-0" />
                                        {t('changePassword.info.logged')}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </aside>

                {/* ── Right: the form ── */}
                <section className="rounded-xl border bg-card lg:col-span-2 lg:self-start">
                    <header className="border-b px-6 py-4">
                        <h2 className="text-base font-semibold">
                            {t('changePassword.form.title')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t('changePassword.form.hint')}
                        </p>
                    </header>

                    <div className="space-y-5 p-6">
                        <Field label={t('changePassword.current')}>
                            <PasswordInput
                                icon={Lock}
                                value={currentPassword}
                                onChange={setCurrentPassword}
                                placeholder={t(
                                    'changePassword.current.placeholder',
                                )}
                                autoComplete="current-password"
                            />
                        </Field>

                        <div className="border-t" />

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label={t('changePassword.new')}>
                                <PasswordInput
                                    icon={KeyRound}
                                    value={newPassword}
                                    onChange={setNewPassword}
                                    placeholder={t(
                                        'changePassword.new.placeholder',
                                    )}
                                    autoComplete="new-password"
                                />
                            </Field>
                            <Field label={t('changePassword.confirm')}>
                                <PasswordInput
                                    icon={KeyRound}
                                    value={confirmPassword}
                                    onChange={setConfirmPassword}
                                    placeholder={t(
                                        'changePassword.confirm.placeholder',
                                    )}
                                    autoComplete="new-password"
                                    invalid={confirmTouched && !matches}
                                    valid={matches}
                                />
                                {confirmTouched && (
                                    <p
                                        aria-live="polite"
                                        className={`flex items-center gap-1.5 text-xs ${
                                            matches
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-destructive'
                                        }`}
                                    >
                                        {matches ? (
                                            <CircleCheck className="size-3.5" />
                                        ) : (
                                            <CircleAlert className="size-3.5" />
                                        )}
                                        {matches
                                            ? t('changePassword.match')
                                            : t(
                                                  'changePassword.validation.mismatch',
                                              )}
                                    </p>
                                )}
                            </Field>
                        </div>
                        {newPassword && (
                            <PasswordStrength password={newPassword} />
                        )}
                    </div>

                    <footer className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-muted-foreground">
                            {t('changePassword.info.signOut')}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={changePassword.isPending}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit}
                                className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                            >
                                {changePassword.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <KeyRound className="size-4" />
                                )}
                                {t('changePassword.submit')}
                            </Button>
                        </div>
                    </footer>
                </section>
            </div>
        </form>
    );
}

/** Password field with a leading icon and its own show/hide toggle. */
function PasswordInput({
    icon: Icon,
    value,
    onChange,
    placeholder,
    autoComplete,
    invalid,
    valid,
}: {
    icon: LucideIcon;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete: string;
    invalid?: boolean;
    valid?: boolean;
}) {
    const { t } = useI18n();
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                aria-invalid={invalid || undefined}
                className={`${inputClass} pl-10 pr-11 ${
                    valid
                        ? 'border-emerald-500 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-500'
                        : ''
                }`}
            />
            <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={
                    show ? t('changePassword.hide') : t('changePassword.show')
                }
                title={
                    show ? t('changePassword.hide') : t('changePassword.show')
                }
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            >
                {show ? (
                    <EyeOff className="size-4" />
                ) : (
                    <Eye className="size-4" />
                )}
            </button>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}
