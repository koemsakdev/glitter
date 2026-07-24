'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, Loader, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { Switch } from '@/components/ui/switch';
import { NavItemFormDialog } from '@/features/settings/components/nav-item-form-dialog';
import {
    DEFAULT_NAV_ITEMS,
    DEFAULT_NAV_ORDER,
    NAV_DEFAULTS,
    type StoreConfig,
    type StoreNavItem,
} from '@/features/settings/store-config';
import {
    DEFAULT_NAV_ICON,
    NAV_ICONS,
} from '@/features/settings/nav-icons';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

/** Ensure all known nav ids are present, in the stored order. */
function completeItems(raw?: StoreNavItem[]): StoreNavItem[] {
    const out: StoreNavItem[] = [];
    const seen = new Set<string>();
    for (const it of raw ?? []) {
        if (NAV_LABELS[it.id] && !seen.has(it.id)) {
            seen.add(it.id);
            out.push(it);
        }
    }
    for (const id of DEFAULT_NAV_ORDER) {
        if (!seen.has(id)) out.push({ id, ...NAV_DEFAULTS[id], enabled: true });
    }
    return out;
}

export default function NavigationSettingsPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    const [editing, setEditing] = useState<StoreNavItem | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    if (isLoading) return <LoadingScreen variant="page" />;

    const items = completeItems(data?.config.navItems ?? DEFAULT_NAV_ITEMS);

    function persist(next: StoreNavItem[]) {
        if (!data) return;
        const nextConfig = { ...data.config, navItems: next } as StoreConfig;
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

    function openForm(item: StoreNavItem) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function upsert(item: StoreNavItem) {
        persist(items.map((it) => (it.id === item.id ? item : it)));
        setFormOpen(false);
        setEditing(null);
    }

    function toggle(item: StoreNavItem) {
        persist(
            items.map((it) =>
                it.id === item.id ? { ...it, enabled: !it.enabled } : it,
            ),
        );
    }

    function onDrop(targetIndex: number) {
        if (dragIndex === null || dragIndex === targetIndex) {
            setDragIndex(null);
            return;
        }
        const next = [...items];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        setDragIndex(null);
        persist(next);
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                        {t('settings.nav.title')}
                    </h2>
                    {save.isPending && (
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader className="size-4 animate-spin" />
                            {t('common.saving')}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {t('settings.nav.reorderHint')}
                </p>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="stagger space-y-2">
                {items.map((item, i) => {
                    const Icon =
                        (item.icon && NAV_ICONS[item.icon]) ||
                        DEFAULT_NAV_ICON[item.id];
                    const defaultLabel = t(NAV_LABELS[item.id]);
                    const name =
                        (language === 'km' ? item.labelKm : item.labelEn) ||
                        defaultLabel;
                    return (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={() => setDragIndex(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDrop(i)}
                            className={cn(
                                'flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
                                dragIndex === i &&
                                    'border-pink-300 opacity-60 dark:border-pink-700',
                                !item.enabled && 'opacity-70',
                            )}
                        >
                            <span
                                title={t('settings.nav.drag')}
                                className="cursor-grab text-muted-foreground active:cursor-grabbing"
                            >
                                <GripVertical className="size-5" />
                            </span>

                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground">
                                <Icon className="size-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {[item.labelEn, item.labelKm]
                                        .filter(Boolean)
                                        .join(' · ') || defaultLabel}
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2">
                                <Switch
                                    checked={item.enabled}
                                    onCheckedChange={() => toggle(item)}
                                />
                                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                                    {item.enabled
                                        ? t('settings.sections.visible')
                                        : t('settings.banner.hidden')}
                                </span>
                            </label>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openForm(item)}
                                aria-label={t('common.edit')}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </div>
                    );
                })}
                </div>

                {/* Live preview — how the storefront header menu will look */}
                <div className="space-y-3 rounded-xl border bg-card p-4 lg:sticky lg:top-6">
                    <h3 className="text-sm font-semibold">
                        {t('settings.nav.previewTitle')}
                    </h3>
                    <div className="rounded-lg border bg-background p-3">
                        {items.filter((it) => it.enabled).length === 0 ? (
                            <p className="py-2 text-center text-xs text-muted-foreground">
                                {t('settings.nav.previewEmpty')}
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {items
                                    .filter((it) => it.enabled)
                                    .map((it) => {
                                        const PIcon =
                                            (it.icon && NAV_ICONS[it.icon]) ||
                                            DEFAULT_NAV_ICON[it.id];
                                        const plabel =
                                            (language === 'km'
                                                ? it.labelKm
                                                : it.labelEn) ||
                                            t(NAV_LABELS[it.id]);
                                        return (
                                            <span
                                                key={it.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                                            >
                                                <PIcon className="size-4 text-muted-foreground" />
                                                {plabel}
                                            </span>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('settings.nav.previewNote')}
                    </p>
                </div>
            </div>

            <NavItemFormDialog
                key={formKey}
                open={formOpen}
                item={editing}
                defaultLabel={editing ? t(NAV_LABELS[editing.id]) : undefined}
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditing(null);
                }}
                onSave={upsert}
            />

            <p className="max-w-2xl text-xs text-muted-foreground">
                {t('settings.nav.barNote')}
            </p>
        </div>
    );
}
