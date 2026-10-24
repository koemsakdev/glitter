'use client';

import { Check, History, Loader2, RotateCcw, Save } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import {
    DEFAULT_STORE_CONFIG,
    type StoreConfig,
    mergeStoreConfig,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useIsAdmin } from '@/lib/permissions';
import { useAuditTrail } from '@/stores/use-audit-trail';
import { useI18n } from '@/lib/i18n';

export const inputClass =
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

export interface SettingsCtx {
    config: StoreConfig;
    set: <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => void;
    setConfig: Dispatch<SetStateAction<StoreConfig>>;
}

/**
 * Loads the single storefront config, seeds local state, and renders a
 * Save button + overlay. Each settings sub-page edits its slice and saves
 * the whole config.
 */
export function SettingsPage({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: (ctx: SettingsCtx) => ReactNode;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data, isLoading } = useStoreConfig();
    const isAdmin = useIsAdmin();
    const showTrail = useAuditTrail((st) => st.show);
    const save = useSaveStoreConfig();

    const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
    const seeded = useRef(false);
    useEffect(() => {
        if (!data || seeded.current) return;
        seeded.current = true;
        setConfig(data.config);
    }, [data]);

    function set<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) {
        setConfig((prev) => ({ ...prev, [key]: value }));
    }

    // What's on the server vs. what's on screen → "unsaved changes".
    // Both sides go through the same normaliser, so defaults filled in by the
    // server after a save don't count as a change.
    const savedJson = data ? JSON.stringify(mergeStoreConfig(data.config)) : '';
    const dirty =
        Boolean(data) && JSON.stringify(mergeStoreConfig(config)) !== savedJson;
    const [justSaved, setJustSaved] = useState(false);

    // Warn before leaving the page with unsaved edits.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    function handleSave() {
        save.mutate(
            { config, settingId: data?.settingId ?? null },
            {
                onSuccess: () => {
                    setJustSaved(true);
                    setTimeout(() => setJustSaved(false), 2200);
                },
                onError: (error) =>
                    toast({
                        title: t('common.toast.error'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    }),
            },
        );
    }

    function discard() {
        if (data) setConfig(data.config);
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    const saveButton = (
        <Button
            onClick={handleSave}
            disabled={save.isPending || (!dirty && !justSaved)}
            className={cn(
                'min-w-32 text-white transition-colors sm:shrink-0',
                justSaved
                    ? 'bg-emerald-500 hover:bg-emerald-500 disabled:opacity-100'
                    : 'bg-pink-400 hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800',
            )}
        >
            {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
            ) : justSaved ? (
                <Check className="size-4" />
            ) : (
                <Save className="size-4" />
            )}
            {save.isPending
                ? t('settings.saving')
                : justSaved
                  ? t('settings.savedShort')
                  : t('common.save')}
        </Button>
    );

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                    <span
                        aria-live="polite"
                        className={cn(
                            'hidden items-center gap-1.5 text-xs sm:inline-flex',
                            dirty
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                dirty ? 'bg-amber-500' : 'bg-emerald-500',
                            )}
                        />
                        {dirty ? t('settings.unsaved') : t('settings.allSaved')}
                    </span>
                    {isAdmin && data?.settingId && (
                        <Button
                            variant="outline"
                            onClick={() =>
                                showTrail({
                                    entity: 'app-settings',
                                    id: data.settingId!,
                                    label: t('nav.appSettings'),
                                })
                            }
                        >
                            <History className="size-4" />
                            {t('rowActions.auditTrail')}
                        </Button>
                    )}
                    {saveButton}
                </div>
            </div>
            {children({ config, set, setConfig })}

            {/* Floating save bar while there are unsaved changes */}
            <div
                className={cn(
                    'pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-300',
                    dirty || save.isPending
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-6 opacity-0',
                )}
            >
                <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background/95 py-2 pl-4 pr-2 shadow-xl backdrop-blur">
                    <span className="flex items-center gap-2 text-sm">
                        <span className="size-2 rounded-full bg-amber-500" />
                        {t('settings.unsaved')}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        disabled={save.isPending}
                        onClick={discard}
                    >
                        <RotateCcw className="size-3.5" />
                        {t('settings.discard')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={save.isPending}
                        className="rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                    >
                        {save.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Save className="size-3.5" />
                        )}
                        {save.isPending
                            ? t('settings.saving')
                            : t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function SettingsCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <div className="space-y-4 p-6">{children}</div>
        </div>
    );
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputClass}
            />
        </div>
    );
}

export function ChoiceField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly (readonly [string, string])[];
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-muted/40 p-1.5 dark:bg-input/20">
                {options.map(([v, l]) => {
                    const selected = v === value;
                    return (
                        <button
                            key={v}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(v)}
                            className={cn(
                                'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                                selected
                                    ? 'bg-pink-500 text-white shadow-sm dark:bg-pink-600'
                                    : 'text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-background/40',
                            )}
                        >
                            {l}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function BilingualField({
    label,
    en,
    km,
    onEn,
    onKm,
    textarea,
    maxLength,
}: {
    label: string;
    en: string;
    km: string;
    onEn: (v: string) => void;
    onKm: (v: string) => void;
    textarea?: boolean;
    maxLength?: number;
}) {
    const fieldClass =
        'rounded-lg shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800';
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <div className="grid gap-2 sm:grid-cols-2">
                <div>
                    {textarea ? (
                        <Textarea
                            value={en}
                            onChange={(e) => onEn(e.target.value)}
                            rows={2}
                            maxLength={maxLength}
                            placeholder="English"
                            className={fieldClass}
                        />
                    ) : (
                        <Input
                            value={en}
                            onChange={(e) => onEn(e.target.value)}
                            maxLength={maxLength}
                            placeholder="English"
                            className={`${inputClass} ${fieldClass}`}
                        />
                    )}
                    <span className="mt-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>EN</span>
                        {maxLength && (
                            <span>
                                {en.length}/{maxLength}
                            </span>
                        )}
                    </span>
                </div>
                <div>
                    {textarea ? (
                        <Textarea
                            value={km}
                            onChange={(e) => onKm(e.target.value)}
                            rows={2}
                            maxLength={maxLength}
                            placeholder="ខ្មែរ"
                            className={fieldClass}
                        />
                    ) : (
                        <Input
                            value={km}
                            onChange={(e) => onKm(e.target.value)}
                            maxLength={maxLength}
                            placeholder="ខ្មែរ"
                            className={`${inputClass} ${fieldClass}`}
                        />
                    )}
                    <span className="mt-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>KM</span>
                        {maxLength && (
                            <span>
                                {km.length}/{maxLength}
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}
