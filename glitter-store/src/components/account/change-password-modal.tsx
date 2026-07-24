'use client';

import { useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';

const fieldCls =
    'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

/** Centered, backdrop-dimmed modal shell. */
function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="animate-fade-in-up relative z-10 w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

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
        <Modal title={tr(lang, 'changePassword')} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'currentPassword')}
                    </label>
                    <input
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className={fieldCls}
                        autoComplete="current-password"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'newPassword')}
                    </label>
                    <input
                        type="password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className={fieldCls}
                        autoComplete="new-password"
                    />
                </div>
                {error && (
                    <p className="text-sm font-medium text-red-600">{error}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                        {tr(lang, 'cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !current || !next}
                        className="inline-flex items-center gap-2 rounded-full bg-(--brand) px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {tr(lang, 'saveChanges')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
