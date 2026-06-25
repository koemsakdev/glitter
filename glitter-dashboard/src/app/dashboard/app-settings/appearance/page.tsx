'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import {
    ChoiceField,
    SettingsCard,
} from '@/features/settings/components/settings-shared';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import {
    FONT_FAMILY_OPTIONS,
    type StoreAppearance,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

export default function AppearanceSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    function setA(patch: Partial<StoreAppearance>) {
        if (!data) return;
        const nextConfig = {
            ...data.config,
            appearance: { ...data.config.appearance, ...patch },
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

    if (isLoading || !data) return <LoadingScreen variant="page" />;
    const a = data.config.appearance;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                    {t('settings.appearance.title')}
                </h2>
                {save.isPending && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Loader className="size-4 animate-spin" />
                        <span className="mt-0.5">{t('common.saving')}</span>
                    </span>
                )}
            </div>

            <SettingsCard title={t('settings.appearance.title')}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ChoiceField
                        label={t('settings.appearance.fontSize')}
                        value={a.fontScale}
                        onChange={(v) =>
                            setA({ fontScale: v as StoreAppearance['fontScale'] })
                        }
                        options={[
                            ['sm', t('settings.appearance.small')],
                            ['md', t('settings.appearance.medium')],
                            ['lg', t('settings.appearance.large')],
                        ]}
                    />
                    <ChoiceField
                        label={t('settings.appearance.fontFamily')}
                        value={a.fontFamily}
                        onChange={(v) => setA({ fontFamily: v })}
                        options={FONT_FAMILY_OPTIONS.map((o) => [
                            o.value,
                            t(o.labelKey),
                        ])}
                    />
                    <ChoiceField
                        label={t('settings.appearance.radius')}
                        value={a.radius}
                        onChange={(v) =>
                            setA({ radius: v as StoreAppearance['radius'] })
                        }
                        options={[
                            ['none', t('settings.appearance.none')],
                            ['sm', t('settings.appearance.small')],
                            ['md', t('settings.appearance.medium')],
                            ['lg', t('settings.appearance.large')],
                            ['xl', t('settings.appearance.extraLarge')],
                        ]}
                    />
                    <ChoiceField
                        label={t('settings.appearance.density')}
                        value={a.density}
                        onChange={(v) =>
                            setA({ density: v as StoreAppearance['density'] })
                        }
                        options={[
                            [
                                'comfortable',
                                t('settings.appearance.comfortable'),
                            ],
                            ['compact', t('settings.appearance.compact')],
                        ]}
                    />
                    <ChoiceField
                        label={t('settings.appearance.columns')}
                        value={a.productColumns}
                        onChange={(v) =>
                            setA({
                                productColumns:
                                    v as StoreAppearance['productColumns'],
                            })
                        }
                        options={[
                            ['2', '2'],
                            ['3', '3'],
                            ['4', '4'],
                            ['5', '5'],
                            ['6', '6'],
                        ]}
                    />
                    <ChoiceField
                        label={t('settings.appearance.sort')}
                        value={a.productSort}
                        onChange={(v) =>
                            setA({
                                productSort:
                                    v as StoreAppearance['productSort'],
                            })
                        }
                        options={[
                            ['newest', t('settings.appearance.sortNewest')],
                            [
                                'price-asc',
                                t('settings.appearance.sortPriceLow'),
                            ],
                            [
                                'price-desc',
                                t('settings.appearance.sortPriceHigh'),
                            ],
                        ]}
                    />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                    {t('settings.appearance.note')}
                </p>
            </SettingsCard>
        </div>
    );
}
