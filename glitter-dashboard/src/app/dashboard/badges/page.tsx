'use client';

import { Loader, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { BadgeFormDialog } from '@/features/badges/badge-form-dialog';
import {
    useBadges,
    useCreateBadge,
    useDeleteBadge,
    useUpdateBadge,
} from '@/features/badges/use-badges';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { badgeTintStyle } from '@/types/product-badge';
import type { Badge, BadgeFormValues } from '@/types/badge';

export default function BadgesPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const { data: badges = [], isLoading } = useBadges();
    const create = useCreateBadge();
    const update = useUpdateBadge();
    const remove = useDeleteBadge();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Badge | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Badge | null>(null);

    const pending = create.isPending || update.isPending;
    const badgeName = (b: Badge) =>
        (language === 'km' ? b.nameKm : b.nameEn) || b.nameEn || b.slug;

    function openForm(item: Badge | null) {
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

    function handleSubmit(values: BadgeFormValues) {
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

    function toggleActive(b: Badge) {
        update.mutate({ id: b.id, values: { active: !b.active } }, { onError });
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                            {t('badge.title')}
                        </h1>
                        {(pending || remove.isPending) && (
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader className="size-4 animate-spin" />
                                <span className="mt-0.5">{t('common.saving')}</span>
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('badge.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('badge.add')}
                </Button>
            </div>

            {badges.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('badge.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {badges.map((b) => (
                        <div
                            key={b.id}
                            className={cn(
                                'flex items-center gap-3 rounded-xl border bg-card p-3 transition-opacity',
                                !b.active && 'opacity-55',
                            )}
                        >
                            <span
                                className="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold"
                                style={badgeTintStyle(b.color)}
                            >
                                {badgeName(b)}
                            </span>
                            <div className="flex-1" />
                            <Switch
                                size="lg"
                                checked={b.active}
                                onCheckedChange={() => toggleActive(b)}
                                title={b.active ? t('badge.hide') : t('badge.show')}
                                className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                title={t('common.edit')}
                                onClick={() => openForm(b)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title={t('common.delete')}
                                onClick={() => setDeleting(b)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <BadgeFormDialog
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
                title={t('badge.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting ? badgeName(deleting) : '',
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
