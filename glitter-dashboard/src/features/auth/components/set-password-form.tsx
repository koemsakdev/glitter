'use client';

import {
    CircleCheck,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    isStrongPassword,
    PasswordStrength,
} from '@/components/ui/password-strength';
import { useLogout } from '@/features/auth/use-auth';
import { useChangePassword } from '@/features/profile/use-profile';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { tokenStorage } from '@/lib/token-storage';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/api';

const inputClass =
    'h-11 rounded-lg pr-10 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

/**
 * "Set your new password" — shown right after a first sign-in with the
 * default (or an admin-reset) password. Nothing else in the dashboard opens
 * until this is done; the API enforces the same rule.
 */
export function SetPasswordForm({ user }: { user: User }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const changePassword = useChangePassword();
    const logout = useLogout();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);

    const matches = confirm.length > 0 && confirm === password;
    const canSubmit =
        isStrongPassword(password) && matches && !changePassword.isPending;

    async function handleSubmit() {
        if (!canSubmit) return;
        try {
            const tokens = await changePassword.mutateAsync({
                newPassword: password,
            });
            // The change revokes the old tokens — keep the session with the new ones.
            tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
            setUser({ ...user, mustChangePassword: false });
            toast({
                title: t('setPassword.done'),
                description: t('setPassword.doneHelp'),
                variant: 'success',
                important: true,
            });
            router.replace('/dashboard');
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <Card className="relative w-full overflow-hidden border-border/50 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-pink-300 via-accent to-pink-300 dark:from-pink-800 dark:via-accent dark:to-pink-800" />
            <CardContent className="px-8 pb-8 pt-10">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                        <KeyRound className="size-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('setPassword.title')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('setPassword.hello')}, {user.fullName}.{' '}
                            {t('setPassword.subtitle')}
                        </p>
                    </div>
                </div>

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleSubmit();
                    }}
                >
                    <Field>
                        <FieldLabel htmlFor="new-password">
                            {t('setPassword.new')}
                        </FieldLabel>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={show ? 'text' : 'password'}
                                autoComplete="new-password"
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={() => setShow((v) => !v)}
                                aria-label={show ? 'Hide' : 'Show'}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                            >
                                {show ? (
                                    <EyeOff className="size-4" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                            </button>
                        </div>
                        {password && <PasswordStrength password={password} />}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="confirm-password">
                            {t('setPassword.confirm')}
                        </FieldLabel>
                        <div className="relative">
                            <Input
                                id="confirm-password"
                                type={show ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                aria-invalid={
                                    confirm.length > 0 && !matches
                                        ? true
                                        : undefined
                                }
                                className={inputClass}
                            />
                            {matches && (
                                <CircleCheck className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
                            )}
                        </div>
                        {confirm.length > 0 && !matches && (
                            <p className="text-xs text-destructive">
                                {t('changePassword.validation.mismatch')}
                            </p>
                        )}
                    </Field>

                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="h-11 w-full bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-100 dark:hover:bg-pink-800"
                    >
                        {changePassword.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <KeyRound className="size-4" />
                        )}
                        {changePassword.isPending
                            ? t('common.saving')
                            : t('setPassword.submit')}
                    </Button>
                </form>

                <button
                    type="button"
                    onClick={() =>
                        logout.mutate(undefined, {
                            onSettled: () => router.replace('/login'),
                        })
                    }
                    className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    <LogOut className="size-3.5" />
                    {t('setPassword.signOut')}
                </button>
            </CardContent>
        </Card>
    );
}
