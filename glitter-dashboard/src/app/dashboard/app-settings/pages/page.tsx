'use client';

import { Loader, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { PageFormDialog } from '@/features/settings/components/page-form-dialog';
import {
    useCreatePage,
    useDeletePage,
    usePages,
    useUpdatePage,
} from '@/features/pages/use-pages';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { Page, PageFormValues } from '@/types/page';

export default function PagesSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data: pages = [], isLoading } = usePages();
    const create = useCreatePage();
    const update = useUpdatePage();
    const remove = useDeletePage();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Page | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Page | null>(null);

    const pending = create.isPending || update.isPending;

    function openForm(item: Page | null) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function toastError(error: unknown) {
        toast({
            title: t('settings.couldNotSave'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function handleSubmit(values: PageFormValues) {
        if (editing) {
            update.mutate(
                { id: editing.id, values },
                {
                    onSuccess: () => {
                        setFormOpen(false);
                        setEditing(null);
                    },
                    onError: toastError,
                },
            );
        } else {
            create.mutate(values, {
                onSuccess: () => setFormOpen(false),
                onError: toastError,
            });
        }
    }

    function togglePublished(page: Page) {
        update.mutate(
            { id: page.id, values: { isPublished: !page.isPublished } },
            { onError: toastError },
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">
                            {t('settings.pages.title')}
                        </h2>
                        {(pending || remove.isPending) && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Loader className="size-4 animate-spin" />
                                <span className="mt-0.5">
                                    {t('common.saving')}
                                </span>
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.pages.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('settings.pages.add')}
                </Button>
            </div>

            {pages.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.pages.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger space-y-2">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {page.titleEn || page.titleKm}
                                </p>
                                <p className="truncate font-mono text-xs text-muted-foreground">
                                    /{page.slug}
                                </p>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2">
                                <Switch
                                    checked={page.isPublished}
                                    onCheckedChange={() =>
                                        togglePublished(page)
                                    }
                                    className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                                />
                                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                                    {page.isPublished
                                        ? t('settings.pages.published')
                                        : t('settings.banner.hidden')}
                                </span>
                            </label>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openForm(page)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(page)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <PageFormDialog
                key={formKey}
                open={formOpen}
                item={editing}
                pending={pending}
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditing(null);
                }}
                onSubmit={handleSubmit}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('settings.pages.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.titleEn || deleting?.slug || '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={remove.isPending}
                onConfirm={() => {
                    if (deleting)
                        remove.mutate(deleting.id, {
                            onSuccess: () => setDeleting(null),
                            onError: toastError,
                        });
                }}
            />
        </div>
    );
}
