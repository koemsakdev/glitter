'use client';

import {
    CornerDownRight,
    ExternalLink,
    GripVertical,
    Loader,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { MenuFormDialog } from '@/features/settings/components/menu-form-dialog';
import {
    useCreateMenuItem,
    useDeleteMenuItem,
    useMenu,
    useReorderMenu,
    useUpdateMenuItem,
} from '@/features/menu/use-menu';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { MenuFormValues, MenuItem, MenuLocation } from '@/types/menu';

export default function MenuSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data: items = [], isLoading } = useMenu();
    const create = useCreateMenuItem();
    const update = useUpdateMenuItem();
    const remove = useDeleteMenuItem();
    const reorder = useReorderMenu();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null);
    const [formLocation, setFormLocation] = useState<MenuLocation>('header');
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<MenuItem | null>(null);

    const pending = create.isPending || update.isPending;

    function openForm(item: MenuItem | null, location: MenuLocation) {
        setEditing(item);
        setFormLocation(item?.location ?? location);
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

    function handleSubmit(values: MenuFormValues) {
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
            const count = items.filter(
                (i) => i.location === values.location,
            ).length;
            create.mutate(
                { ...values, displayOrder: count },
                {
                    onSuccess: () => setFormOpen(false),
                    onError: toastError,
                },
            );
        }
    }

    function toggle(item: MenuItem) {
        update.mutate(
            { id: item.id, values: { isActive: !item.isActive } },
            { onError: toastError },
        );
    }

    function handleReorder(ordered: MenuItem[]) {
        reorder.mutate(
            ordered.map((m, index) => ({ id: m.id, displayOrder: index })),
            { onError: toastError },
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    const header = items
        .filter((i) => i.location === 'header')
        .sort((a, b) => a.displayOrder - b.displayOrder);
    const footer = items
        .filter((i) => i.location === 'footer')
        .sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                    {t('settings.menu.title')}
                </h2>
                {(reorder.isPending || remove.isPending) && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Loader className="size-4 animate-spin" />
                        <span className="mt-0.5">{t('common.saving')}</span>
                    </span>
                )}
            </div>
            <p className="-mt-4 text-sm text-muted-foreground">
                {t('settings.menu.subtitle')}
            </p>

            <MenuGroup
                title={t('settings.menu.header')}
                items={header}
                onAdd={() => openForm(null, 'header')}
                onEdit={(item) => openForm(item, 'header')}
                onToggle={toggle}
                onDelete={setDeleting}
                onReorder={handleReorder}
            />
            <MenuGroup
                title={t('settings.menu.footer')}
                items={footer}
                onAdd={() => openForm(null, 'footer')}
                onEdit={(item) => openForm(item, 'footer')}
                onToggle={toggle}
                onDelete={setDeleting}
                onReorder={handleReorder}
            />

            <MenuFormDialog
                key={formKey}
                open={formOpen}
                item={editing}
                allItems={items}
                defaultLocation={formLocation}
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
                title={t('settings.menu.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.labelEn ?? '',
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

function MenuGroup({
    title,
    items,
    onAdd,
    onEdit,
    onToggle,
    onDelete,
    onReorder,
}: {
    title: string;
    items: MenuItem[];
    onAdd: () => void;
    onEdit: (item: MenuItem) => void;
    onToggle: (item: MenuItem) => void;
    onDelete: (item: MenuItem) => void;
    onReorder: (ordered: MenuItem[]) => void;
}) {
    const { t } = useI18n();
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const topLevel = items
        .filter((i) => i.parentId === null)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    const childrenOf = (id: string) =>
        items
            .filter((i) => i.parentId === id)
            .sort((a, b) => a.displayOrder - b.displayOrder);

    function onDrop(targetIndex: number) {
        if (dragIndex === null || dragIndex === targetIndex) {
            setDragIndex(null);
            return;
        }
        const next = [...topLevel];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        setDragIndex(null);
        onReorder(next);
    }

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <h3 className="text-sm font-semibold">{title}</h3>
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={onAdd}
                >
                    <Plus className="size-4" />
                    {t('settings.menu.add')}
                </Button>
            </div>

            {topLevel.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    {t('settings.menu.empty')}
                </p>
            ) : (
                <div className="stagger space-y-2 p-4">
                    {topLevel.map((item, i) => (
                        <div key={item.id} className="space-y-2">
                            <div
                                draggable
                                onDragStart={() => setDragIndex(i)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => onDrop(i)}
                                className={`flex items-center gap-3 rounded-xl border bg-background p-3 transition-colors ${
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
                                <MenuRow
                                    item={item}
                                    onEdit={onEdit}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                />
                            </div>

                            {childrenOf(item.id).map((child) => (
                                <div
                                    key={child.id}
                                    className="ml-8 flex items-center gap-3 rounded-xl border border-dashed bg-background p-3"
                                >
                                    <CornerDownRight className="size-4 shrink-0 text-muted-foreground" />
                                    <MenuRow
                                        item={child}
                                        onEdit={onEdit}
                                        onToggle={onToggle}
                                        onDelete={onDelete}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MenuRow({
    item,
    onEdit,
    onToggle,
    onDelete,
}: {
    item: MenuItem;
    onEdit: (item: MenuItem) => void;
    onToggle: (item: MenuItem) => void;
    onDelete: (item: MenuItem) => void;
}) {
    return (
        <>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">
                        {item.labelEn}
                    </p>
                    {item.openInNewTab && (
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                    {item.url}
                </p>
            </div>
            <Switch
                checked={item.isActive}
                onCheckedChange={() => onToggle(item)}
                className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
            />
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(item)}
            >
                <Pencil className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(item)}
            >
                <Trash2 className="size-4" />
            </Button>
        </>
    );
}
