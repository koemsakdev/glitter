'use client';

import { Loader, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { ColorFormDialog } from '@/features/colors/color-form-dialog';
import {
    useColors,
    useCreateColor,
    useDeleteColor,
    useUpdateColor,
} from '@/features/colors/use-colors';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { Color, ColorFormValues } from '@/types/color';

export default function ColorsPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const { data: colors = [], isLoading } = useColors();
    const create = useCreateColor();
    const update = useUpdateColor();
    const remove = useDeleteColor();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Color | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Color | null>(null);

    const pending = create.isPending || update.isPending;
    const colorName = (c: Color) =>
        (language === 'km' ? c.nameKm : c.nameEn) || c.nameEn || c.nameKm;

    function openForm(item: Color | null) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function onError(error: unknown) {
        toast({
            title: t('common.toast.error'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function handleSubmit(values: ColorFormValues) {
        if (editing) {
            update.mutate(
                { id: editing.id, values },
                {
                    onSuccess: () => {
                        setFormOpen(false);
                        setEditing(null);
                    },
                    onError,
                },
            );
        } else {
            create.mutate(values, {
                onSuccess: () => setFormOpen(false),
                onError,
            });
        }
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                            {t('color.title')}
                        </h1>
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
                        {t('color.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('color.add')}
                </Button>
            </div>

            {colors.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('color.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {colors.map((c) => (
                        <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                            <span
                                className="size-10 shrink-0 rounded-full border border-border/60"
                                style={{ backgroundColor: c.hex }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {colorName(c)}
                                </p>
                                <p className="truncate font-mono text-xs uppercase text-muted-foreground">
                                    {c.hex}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => openForm(c)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(c)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <ColorFormDialog
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
                title={t('color.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting ? colorName(deleting) : '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={remove.isPending}
                onConfirm={() => {
                    if (deleting)
                        remove.mutate(deleting.id, {
                            onSuccess: () => setDeleting(null),
                            onError,
                        });
                }}
            />
        </div>
    );
}
