'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChangePassword } from '@/features/profile/use-profile';
import { useLogout } from '@/features/auth/use-auth';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

const inputClass =
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

export function ChangePasswordView() {
    const { t } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const changePassword = useChangePassword();
    const logout = useLogout();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [show, setShow] = useState(false);

    async function handleSubmit() {
        if (!currentPassword) {
            toast({
                title: t('common.toast.error'),
                description: t('changePassword.validation.currentRequired'),
                variant: 'destructive',
            });
            return;
        }
        if (newPassword.length < 8) {
            toast({
                title: t('common.toast.error'),
                description: t('changePassword.validation.minLength'),
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

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('changePassword.title')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('changePassword.subtitle')}
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit();
                }}
                className="space-y-4 rounded-xl border bg-card p-5"
            >
                <Field label={t('changePassword.current')}>
                    <Input
                        type={show ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={inputClass}
                        autoComplete="current-password"
                    />
                </Field>
                <Field label={t('changePassword.new')}>
                    <Input
                        type={show ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                        autoComplete="new-password"
                    />
                </Field>
                <Field label={t('changePassword.confirm')}>
                    <Input
                        type={show ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                        autoComplete="new-password"
                    />
                </Field>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                        {show ? (
                            <EyeOff className="size-4" />
                        ) : (
                            <Eye className="size-4" />
                        )}
                        {show
                            ? t('changePassword.hide')
                            : t('changePassword.show')}
                    </button>
                </label>

                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={changePassword.isPending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {changePassword.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('changePassword.submit')}
                    </Button>
                </div>
            </form>
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
