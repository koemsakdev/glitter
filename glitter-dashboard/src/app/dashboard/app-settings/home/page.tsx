'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { AnnouncementDialog } from '@/features/settings/components/announcement-dialog';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import type { Announcement } from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

export default function HomeSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Announcement | null>(null);

    const announcements = data?.config.announcements ?? [];

    function persist(next: Announcement[]) {
        if (!data) return;
        const nextConfig = { ...data.config, announcements: next };
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

    function openForm(item: Announcement | null) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function upsert(item: Announcement) {
        persist(
            announcements.some((a) => a.id === item.id)
                ? announcements.map((a) => (a.id === item.id ? item : a))
                : [...announcements, item],
        );
        setFormOpen(false);
        setEditing(null);
    }

    function toggle(item: Announcement) {
        persist(
            announcements.map((a) =>
                a.id === item.id ? { ...a, enabled: !a.enabled } : a,
            ),
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">
                            {t('settings.announce.title')}
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
                        {t('settings.announce.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('settings.announce.add')}
                </Button>
            </div>

            {announcements.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.announce.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger space-y-2">
                    {announcements.map((a) => (
                        <div
                            key={a.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {a.textEn || a.textKm}
                                </p>
                                {(a.startAt || a.endAt) && (
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        <CalendarClock className="size-3" />
                                        {a.startAt ?? '…'} → {a.endAt ?? '…'}
                                    </p>
                                )}
                            </div>
                            <label className="flex cursor-pointer items-center gap-2">
                                <Switch
                                    checked={a.enabled}
                                    onCheckedChange={() => toggle(a)}
                                    className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                                />
                                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                                    {a.enabled
                                        ? t('settings.sections.visible')
                                        : t('settings.banner.hidden')}
                                </span>
                            </label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openForm(a)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(a)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <AnnouncementDialog
                key={formKey}
                open={formOpen}
                item={editing}
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
                title={t('settings.announce.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.textEn || deleting?.textKm || '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={save.isPending}
                onConfirm={() => {
                    if (deleting)
                        persist(
                            announcements.filter((a) => a.id !== deleting.id),
                        );
                    setDeleting(null);
                }}
            />
        </div>
    );
}
