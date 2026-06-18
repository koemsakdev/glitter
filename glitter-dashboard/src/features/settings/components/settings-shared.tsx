'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import { useToast } from '@/hooks/use-toast';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import {
    DEFAULT_STORE_CONFIG,
    type StoreConfig,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
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

    function handleSave() {
        save.mutate(
            { config, settingId: data?.settingId ?? null },
            {
                onSuccess: () =>
                    toast({ title: t('settings.saved'), variant: 'success' }),
                onError: (error) =>
                    toast({
                        title: t('common.toast.error'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    }),
            },
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6 pb-12">
            <SavingOverlay open={save.isPending} />
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
                <Button
                    onClick={handleSave}
                    disabled={save.isPending}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                >
                    {t('common.save')}
                </Button>
            </div>
            {children({ config, set, setConfig })}
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
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:border-pink-500 focus-visible:outline-none dark:bg-input/30 dark:focus-visible:border-pink-800"
            >
                {options.map(([v, l]) => (
                    <option key={v} value={v}>
                        {l}
                    </option>
                ))}
            </select>
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
}: {
    label: string;
    en: string;
    km: string;
    onEn: (v: string) => void;
    onKm: (v: string) => void;
    textarea?: boolean;
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
                            placeholder="English"
                            className={fieldClass}
                        />
                    ) : (
                        <Input
                            value={en}
                            onChange={(e) => onEn(e.target.value)}
                            placeholder="English"
                            className={`${inputClass} ${fieldClass}`}
                        />
                    )}
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                        EN
                    </span>
                </div>
                <div>
                    {textarea ? (
                        <Textarea
                            value={km}
                            onChange={(e) => onKm(e.target.value)}
                            rows={2}
                            placeholder="ខ្មែរ"
                            className={fieldClass}
                        />
                    ) : (
                        <Input
                            value={km}
                            onChange={(e) => onKm(e.target.value)}
                            placeholder="ខ្មែរ"
                            className={`${inputClass} ${fieldClass}`}
                        />
                    )}
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
                        KM
                    </span>
                </div>
            </div>
        </div>
    );
}
