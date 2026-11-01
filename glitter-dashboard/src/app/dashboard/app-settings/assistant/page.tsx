'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Palette } from 'lucide-react';
import { useState } from 'react';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    AssistantIcon,
    type AssistantIconId,
} from '@/features/settings/components/assistant-icons';
import { SettingsCard } from '@/features/settings/components/settings-shared';
import { StorePhonePreview } from '@/features/settings/components/store-phone-preview';
import {
    ASSISTANT_ICONS,
    type StoreAssistant,
} from '@/features/settings/store-config';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useIsAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

const ICON_TEXT: Record<
    AssistantIconId,
    { name: TranslationKey; desc: TranslationKey }
> = {
    buddy: {
        name: 'settings.assistant.icon.buddy',
        desc: 'settings.assistant.icon.buddyDesc',
    },
    bot: {
        name: 'settings.assistant.icon.bot',
        desc: 'settings.assistant.icon.botDesc',
    },
    typing: {
        name: 'settings.assistant.icon.typing',
        desc: 'settings.assistant.icon.typingDesc',
    },
    orbit: {
        name: 'settings.assistant.icon.orbit',
        desc: 'settings.assistant.icon.orbitDesc',
    },
    headset: {
        name: 'settings.assistant.icon.headset',
        desc: 'settings.assistant.icon.headsetDesc',
    },
};

const SWATCHES = [
    '#ec4899',
    '#8b5cf6',
    '#3b82f6',
    '#0ea5e9',
    '#14b8a6',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#18181b',
];

/** App settings → AI assistant: icon + colour of the store's chat widget. */
export default function AssistantSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const isAdmin = useIsAdmin();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    if (isLoading || !data) return <LoadingScreen variant="page" />;

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-16 text-center">
                <Lock className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                    {t('settings.assistant.adminOnly')}
                </p>
            </div>
        );
    }

    const a = data.config.assistant;
    const themeColor = data.config.themeColor;
    const shown = a.color || themeColor;

    function setAssistant(patch: Partial<StoreAssistant>) {
        if (!data) return;
        const nextConfig = {
            ...data.config,
            assistant: { ...data.config.assistant, ...patch },
        };
        queryClient.setQueryData(CONFIG_KEY, { ...data, config: nextConfig });
        save.mutate(
            { config: nextConfig, settingId: data.settingId },
            {
                onError: (error) => {
                    void queryClient.invalidateQueries({
                        queryKey: ['app-settings'],
                    });
                    toast({
                        title: t('settings.couldNotSave'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    });
                },
            },
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                    {t('settings.assistant.title')}
                </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    {/* Icon */}
                    <SettingsCard title={t('settings.assistant.iconTitle')}>
                        <p className="-mt-1 text-sm text-muted-foreground">
                            {t('settings.assistant.iconHint')}
                        </p>
                        <div
                            role="radiogroup"
                            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
                        >
                            {ASSISTANT_ICONS.map((id) => {
                                const active = a.icon === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() =>
                                            !active &&
                                            setAssistant({ icon: id })
                                        }
                                        className={cn(
                                            'relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all',
                                            active
                                                ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-400 dark:border-pink-700 dark:bg-pink-500/10 dark:ring-pink-700'
                                                : 'hover:border-foreground/20 hover:bg-muted/40',
                                        )}
                                    >
                                        {active && (
                                            <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-pink-500 text-white">
                                                <Check className="size-3" />
                                            </span>
                                        )}
                                        <AssistantIcon
                                            icon={id}
                                            color={shown}
                                            className="size-14"
                                        />
                                        <span className="text-sm font-semibold">
                                            {t(ICON_TEXT[id].name)}
                                        </span>
                                        <span className="text-xs leading-snug text-muted-foreground">
                                            {t(ICON_TEXT[id].desc)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </SettingsCard>

                    {/* Colour */}
                    <SettingsCard title={t('settings.assistant.colorTitle')}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30">
                            <input
                                type="radio"
                                name="ai-color"
                                checked={!a.color}
                                onChange={() => setAssistant({ color: '' })}
                                className="size-4 accent-pink-500"
                            />
                            <span
                                className="size-6 shrink-0 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: themeColor }}
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-medium">
                                    {t('settings.assistant.useTheme')}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {t('settings.assistant.useThemeHint')}
                                </span>
                            </span>
                        </label>

                        <div
                            className={cn(
                                'rounded-xl border px-4 py-3',
                                a.color &&
                                    'border-pink-300 dark:border-pink-700',
                            )}
                        >
                            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                                <Palette className="size-4 text-muted-foreground" />
                                {t('settings.assistant.custom')}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {SWATCHES.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        aria-label={c}
                                        onClick={() =>
                                            setAssistant({ color: c })
                                        }
                                        className={cn(
                                            'flex size-8 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110',
                                            a.color.toLowerCase() === c &&
                                                'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                                        )}
                                        style={{ backgroundColor: c }}
                                    >
                                        {a.color.toLowerCase() === c && (
                                            <Check className="size-4 text-white" />
                                        )}
                                    </button>
                                ))}
                                <label className="ml-1 flex items-center gap-2 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                                    <input
                                        type="color"
                                        value={shown}
                                        onChange={(e) =>
                                            setAssistant({
                                                color: e.target.value,
                                            })
                                        }
                                        className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                    />
                                    <span className="font-mono uppercase">
                                        {shown}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </SettingsCard>
                </div>

                {/* Live preview */}
                <aside className="lg:sticky lg:top-24 lg:h-fit">
                    <AssistantPreview
                        icon={a.icon}
                        color={shown}
                        brandName={data.config.brandNameEn || 'Glitter'}
                    />
                </aside>
            </div>
        </div>
    );
}

/**
 * Live preview: the REAL storefront in a phone frame, so what you see is
 * exactly what shoppers get (nothing is sent to the AI).
 */
function AssistantPreview({
    icon,
    color,
}: {
    icon: AssistantIconId;
    color: string;
    brandName?: string;
}) {
    const { t } = useI18n();
    const [view, setView] = useState<'chat' | 'button'>('chat');
    return (
        <StorePhonePreview
            title={t('settings.assistant.preview')}
            query={`aiPreview=chat&aiIcon=${icon}&aiColor=${encodeURIComponent(color)}`}
            message={{ type: 'glitter-ai-preview', view, icon, color }}
            note={t('settings.assistant.previewNote')}
            toolbar={
                <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                    {(['chat', 'button'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            className={cn(
                                'rounded-md px-2.5 py-1 transition-colors',
                                view === v
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {v === 'chat'
                                ? t('settings.assistant.viewChat')
                                : t('settings.assistant.viewButton')}
                        </button>
                    ))}
                </div>
            }
        />
    );
}
