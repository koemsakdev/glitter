'use client';

import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, Loader, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { SectionFormDialog } from '@/features/settings/components/section-form-dialog';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import type {
    HomeSection,
    HomeSectionType,
    SectionPage,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

const TYPE_LABEL: Record<HomeSectionType, TranslationKey> = {
    'new-arrivals': 'settings.sections.typeNewArrivals',
    'best-selling': 'settings.sections.typeBestSelling',
    categories: 'settings.sections.typeCategories',
    'category-products': 'settings.sections.typeCategoryProducts',
};
const PAGE_LABEL: Record<SectionPage, TranslationKey> = {
    home: 'settings.sections.pageHome',
    products: 'settings.sections.pageProducts',
};

export default function SectionsSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<HomeSection | null>(null);
    const [deleting, setDeleting] = useState<HomeSection | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [formKey, setFormKey] = useState(0);

    function openForm(section: HomeSection | null) {
        setEditing(section);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    const sections = data?.config.sections ?? [];

    function persist(next: HomeSection[]) {
        if (!data) return;
        const nextConfig = { ...data.config, sections: next };
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

    function upsert(section: HomeSection) {
        persist(
            sections.some((s) => s.id === section.id)
                ? sections.map((s) => (s.id === section.id ? section : s))
                : [...sections, section],
        );
        setFormOpen(false);
        setEditing(null);
    }

    function toggle(section: HomeSection) {
        persist(
            sections.map((s) =>
                s.id === section.id ? { ...s, enabled: !s.enabled } : s,
            ),
        );
    }

    function handleDelete() {
        if (!deleting) return;
        persist(sections.filter((s) => s.id !== deleting.id));
        setDeleting(null);
    }

    function onDrop(targetIndex: number) {
        if (dragIndex === null || dragIndex === targetIndex) {
            setDragIndex(null);
            return;
        }
        const next = [...sections];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        setDragIndex(null);
        persist(next);
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">
                            {t('settings.sections.title')}
                        </h2>
                        {save.isPending && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Loader className="size-4 animate-spin" />
                                <span className="mt-0.5">
                                    {t('common.saving')}
                                </span>
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.sections.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('settings.sections.add')}
                </Button>
            </div>

            {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.sections.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger space-y-2">
                    {sections.map((section, i) => (
                        <div
                            key={section.id}
                            draggable
                            onDragStart={() => setDragIndex(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDrop(i)}
                            className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors ${
                                dragIndex === i
                                    ? 'border-pink-300 opacity-60 dark:border-pink-700'
                                    : ''
                            }`}
                        >
                            <span
                                title={t('settings.sections.dragHint')}
                                className="cursor-grab text-muted-foreground active:cursor-grabbing"
                            >
                                <GripVertical className="size-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium">
                                        {section.titleEn ||
                                            section.titleKm ||
                                            t(TYPE_LABEL[section.type])}
                                    </p>
                                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {t(PAGE_LABEL[section.page])}
                                    </span>
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                    {t(TYPE_LABEL[section.type])}
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2">
                                <Switch
                                    checked={section.enabled}
                                    onCheckedChange={() => toggle(section)}
                                    className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                                />
                                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                                    {section.enabled
                                        ? t('settings.sections.visible')
                                        : t('settings.banner.hidden')}
                                </span>
                            </label>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openForm(section)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(section)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <SectionFormDialog
                key={formKey}
                open={formOpen}
                section={editing}
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditing(null);
                }}
                onSave={upsert}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('settings.sections.deleteTitle')}
                description={t('settings.sections.deleteDesc')}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={save.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
}
