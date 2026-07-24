'use client';

import { useState } from 'react';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { tr, type Lang } from '@/lib/locale';

export function ChangePasswordModal({
    lang,
    authFetch,
    onClose,
    onChanged,
}: {
    lang: Lang;
    authFetch: (input: string, init?: RequestInit) => Promise<Response>;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save() {
        setError('');
        if (!current || !next) return;
        setSaving(true);
        try {
            const res = await authFetch('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: next,
                }),
            });
            if (!res.ok) {
                const d = (await res.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(d?.message || tr(lang, 'updateFailed'));
            }
            onChanged();
        } catch (e) {
            setError(e instanceof Error ? e.message : tr(lang, 'updateFailed'));
            setSaving(false);
        }
    }

    return (
        <ResponsiveModal
            open
            onOpenChange={(o) => !o && onClose()}
            title={tr(lang, 'changePassword')}
            className="md:max-w-md"
        >
            <div className="p-5 md:p-6">
                {/* Header */}
                <div className="mb-5 flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--brand)/10 text-(--brand)">
                        <KeyRound className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'changePassword')}
                        </h2>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            {tr(lang, 'changePasswordDesc')}
                        </p>
                    </div>
                </div>

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="cp-current">
                            {tr(lang, 'currentPassword')}
                        </FieldLabel>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                            <Input
                                id="cp-current"
                                type="password"
                                autoComplete="current-password"
                                value={current}
                                onChange={(e) => setCurrent(e.target.value)}
                                placeholder={tr(
                                    lang,
                                    'currentPasswordPlaceholder',
                                )}
                                className="pl-9"
                            />
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="cp-new">
                            {tr(lang, 'newPassword')}
                        </FieldLabel>
                        <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                            <Input
                                id="cp-new"
                                type="password"
                                autoComplete="new-password"
                                value={next}
                                onChange={(e) => setNext(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void save();
                                }}
                                placeholder={tr(lang, 'newPasswordPlaceholder')}
                                className="pl-9"
                            />
                        </div>
                    </Field>

                    {error && (
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </FieldGroup>

                {/* Footer */}
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        {tr(lang, 'cancel')}
                    </Button>
                    <Button
                        onClick={() => void save()}
                        disabled={saving || !current || !next}
                    >
                        {saving && (
                            <Loader2 className="mr-1 size-4 animate-spin" />
                        )}
                        {tr(lang, 'saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
