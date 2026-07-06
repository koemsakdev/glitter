'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Mail, Phone, Trash2, User } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UserAvatar } from '@/components/user-avatar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { tr, type Lang } from '@/lib/locale';

export function ProfileEditSheet({
    lang,
    userId,
    initialName,
    initialEmail,
    initialPhone,
    initialAvatar,
    onClose,
    onSaved,
}: {
    lang: Lang;
    userId: string;
    initialName: string;
    initialEmail: string;
    initialPhone: string;
    initialAvatar: string | null;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}) {
    const { authFetch } = useAuth();
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState(initialPhone);
    // Avatar changes are staged and only applied when the user hits Save.
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingRemove, setPendingRemove] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const objectUrl = useMemo(
        () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
        [pendingFile],
    );
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    // What to show in the avatar preview.
    const previewUrl = pendingFile
        ? objectUrl
        : pendingRemove
          ? null
          : fileUrl(initialAvatar);
    const hasPhoto = Boolean(pendingFile || (initialAvatar && !pendingRemove));

    async function save() {
        setError('');
        if (!name.trim()) return setError(tr(lang, 'nameRequired'));
        setSaving(true);
        try {
            // 1) Apply the staged avatar change first.
            if (pendingFile) {
                const fd = new FormData();
                fd.append('avatar', pendingFile);
                const up = await authFetch(`/api/users/${userId}/avatar`, {
                    method: 'PATCH',
                    body: fd,
                });
                if (!up.ok) throw new Error(tr(lang, 'updateFailed'));
            } else if (pendingRemove && initialAvatar) {
                const del = await authFetch(`/api/users/${userId}/avatar`, {
                    method: 'DELETE',
                });
                if (!del.ok) throw new Error(tr(lang, 'updateFailed'));
            }

            // 2) Save the profile fields.
            const res = await authFetch(`/api/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    fullName: name.trim(),
                    email: email.trim() || undefined,
                    phoneNumber: phone.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const d = (await res.json().catch(() => null)) as {
                    message?: string | string[];
                } | null;
                const msg = Array.isArray(d?.message)
                    ? d.message.join(', ')
                    : d?.message;
                throw new Error(msg || tr(lang, 'updateFailed'));
            }

            await onSaved();
            onClose();
        } catch (e) {
            setError(
                e instanceof Error && e.message
                    ? e.message
                    : tr(lang, 'updateFailed'),
            );
            setSaving(false);
        }
    }

    return (
        <Sheet
            open
            onOpenChange={(o) => {
                if (!o) onClose();
            }}
        >
            <SheetContent className="sheet-adaptive inset-0 left-0 flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-md sm:max-w-[92%]">
                <div className="shrink-0 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <SheetTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'editProfile')}
                    </SheetTitle>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'editProfileSub')}
                    </p>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto bg-zinc-50 p-5 dark:bg-zinc-950">
                    {/* Avatar */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900">
                        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'profilePhoto')}
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={previewUrl}
                                        alt=""
                                        className="size-20 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <UserAvatar
                                        src={null}
                                        name={name}
                                        className="size-20 rounded-2xl text-2xl"
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                                >
                                    <Camera className="size-4" />
                                    {tr(lang, 'changePhoto')}
                                </button>
                                {hasPhoto && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPendingFile(null);
                                            setPendingRemove(true);
                                        }}
                                        className="ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-red-600"
                                    >
                                        <Trash2 className="size-4" />
                                        {tr(lang, 'removePhoto')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    setPendingFile(f);
                                    setPendingRemove(false);
                                }
                                e.target.value = '';
                            }}
                        />
                    </div>

                    {/* Personal info */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900">
                        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'personalInfo')}
                        </p>
                        <div className="space-y-4">
                            <Field
                                icon={User}
                                label={tr(lang, 'fullName')}
                                value={name}
                                onChange={setName}
                            />
                            <Field
                                icon={Phone}
                                label={tr(lang, 'phone')}
                                value={phone}
                                onChange={setPhone}
                                inputMode="tel"
                            />
                            <div>
                                <Field
                                    icon={Mail}
                                    label={tr(lang, 'email')}
                                    value={email}
                                    onChange={setEmail}
                                    type="email"
                                />
                                <p className="mt-1.5 text-xs text-zinc-400">
                                    {tr(lang, 'emailNote')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 disabled:opacity-60"
                    >
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {tr(lang, 'saveChanges')}
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Field({
    icon: Icon,
    label,
    value,
    onChange,
    type = 'text',
    inputMode,
}: {
    icon: typeof User;
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    inputMode?: 'tel' | 'text' | 'email';
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {label}
            </label>
            <div className="relative">
                <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                    type={type}
                    value={value}
                    inputMode={inputMode}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
            </div>
        </div>
    );
}
