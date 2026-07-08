'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, GripVertical, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    DEFAULT_NAV_ORDER,
    type StoreConfig,
} from '@/features/settings/store-config';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

/** Fixed storefront menus → their dashboard label key. */
const NAV_LABELS: Record<string, TranslationKey> = {
    home: 'settings.nav.home',
    promotion: 'settings.nav.promotion',
    product: 'settings.nav.product',
    brand: 'settings.nav.brand',
    location: 'settings.nav.location',
    social: 'settings.nav.social',
};

export default function NavigationSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    if (isLoading) return <LoadingScreen variant="page" />;

    const order = (data?.config.navOrder ?? DEFAULT_NAV_ORDER).filter(
        (id) => NAV_LABELS[id],
    );

    function persist(patch: Partial<StoreConfig>) {
        if (!data) return;
        const nextConfig = { ...data.config, ...patch };
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

    function move(index: number, dir: -1 | 1) {
        const next = [...order];
        const j = index + dir;
        if (j < 0 || j >= next.length) return;
        [next[index], next[j]] = [next[j], next[index]];
        persist({ navOrder: next });
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {t('settings.nav.title')}
                    </h1>
                    {save.isPending && (
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader className="size-4 animate-spin" />
                            {t('common.saving')}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {t('settings.nav.subtitle')}
                </p>
            </div>

            <div className="max-w-lg space-y-2">
                {order.map((id, i) => (
                    <div
                        key={id}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3"
                    >
                        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {i + 1}
                        </span>
                        <span className="flex-1 font-medium">
                            {t(NAV_LABELS[id])}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={i === 0}
                            aria-label={t('settings.nav.moveUp')}
                            onClick={() => move(i, -1)}
                        >
                            <ArrowUp className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={i === order.length - 1}
                            aria-label={t('settings.nav.moveDown')}
                            onClick={() => move(i, 1)}
                        >
                            <ArrowDown className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <p className="max-w-lg text-xs text-muted-foreground">
                {t('settings.nav.barNote')}
            </p>
        </div>
    );
}
