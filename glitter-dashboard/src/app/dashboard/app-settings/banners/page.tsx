'use client';

import {
    ArrowDown,
    ArrowUp,
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
import { BannerFormDialog } from '@/features/banners/banner-form-dialog';
import {
    useBanners,
    useCreateBanner,
    useDeleteBanner,
    useUpdateBanner,
} from '@/features/banners/use-banners';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    type Banner,
    type BannerFormValues,
    type BannerPlacement,
    type BannerStatus,
} from '@/types/banner';

const STATUS_LABEL: Record<BannerStatus, TranslationKey> = {
    active: 'banner.status.active',
    inactive: 'banner.status.inactive',
    scheduled: 'banner.status.scheduled',
    archived: 'banner.status.archived',
};
const STATUS_STYLE: Record<BannerStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    inactive: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
    scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',
};
const PLACEMENT_LABEL: Record<BannerPlacement, TranslationKey> = {
    home_hero: 'banner.placement.home_hero',
    home_secondary: 'banner.placement.home_secondary',
    category_top: 'banner.placement.category_top',
    checkout: 'banner.placement.checkout',
};

export default function BannersSettingsPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const { data: banners = [], isLoading } = useBanners();
    const create = useCreateBanner();
    const update = useUpdateBanner();
    const remove = useDeleteBanner();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Banner | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Banner | null>(null);

    const pending = create.isPending || update.isPending;
    const bannerTitle = (b: Banner) =>
        (language === 'km' ? b.titleKm : b.titleEn) ||
        b.titleEn ||
        b.titleKm ||
        t('banner.untitled');

    function openForm(item: Banner | null) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function onError(error: unknown) {
        toast({
            title: t('settings.couldNotSave'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function handleSubmit(values: BannerFormValues) {
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

    function toggleStatus(b: Banner) {
        update.mutate(
            {
                id: b.id,
                values: {
                    status: b.status === 'active' ? 'inactive' : 'active',
                },
            },
            { onError },
        );
    }

    function move(index: number, dir: -1 | 1) {
        const other = index + dir;
        if (other < 0 || other >= banners.length) return;
        const a = banners[index];
        const b = banners[other];
        update.mutate(
            { id: a.id, values: { displayOrder: b.displayOrder } },
            { onError },
        );
        update.mutate(
            { id: b.id, values: { displayOrder: a.displayOrder } },
            { onError },
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">
                            {t('settings.banner.title')}
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
                        {t('settings.banner.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('settings.banner.add')}
                </Button>
            </div>

            {banners.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.banner.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
                    {banners.map((b, index) => {
                        const img = getFileUrl(b.imageUrl);
                        return (
                            <div
                                key={b.id}
                                className="overflow-hidden rounded-xl border bg-card"
                            >
                                <div className="relative h-40 bg-muted/30">
                                    {img && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={img}
                                            alt={b.imageAltText ?? ''}
                                            className={cn(
                                                'size-full object-cover',
                                                b.status !== 'active' &&
                                                    'opacity-40',
                                            )}
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                            STATUS_STYLE[b.status],
                                        )}
                                    >
                                        {t(STATUS_LABEL[b.status])}
                                    </span>
                                    <div className="absolute left-2 top-2 flex gap-1">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => move(index, -1)}
                                            className="flex size-6 items-center justify-center rounded-md bg-white/90 text-zinc-700 shadow disabled:opacity-40 dark:bg-zinc-800/90 dark:text-zinc-100"
                                        >
                                            <ArrowUp className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === banners.length - 1}
                                            onClick={() => move(index, 1)}
                                            className="flex size-6 items-center justify-center rounded-md bg-white/90 text-zinc-700 shadow disabled:opacity-40 dark:bg-zinc-800/90 dark:text-zinc-100"
                                        >
                                            <ArrowDown className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-medium">
                                            {bannerTitle(b)}
                                        </p>
                                        <div className="flex shrink-0 gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openForm(b)}
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => setDeleting(b)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <label className="mr-1 flex cursor-pointer items-center gap-1.5">
                                            <Switch
                                                checked={b.status === 'active'}
                                                onCheckedChange={() =>
                                                    toggleStatus(b)
                                                }
                                            />
                                        </label>
                                        {b.placements.map((p) => (
                                            <span
                                                key={p}
                                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                            >
                                                {t(PLACEMENT_LABEL[p])}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <BannerFormDialog
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
                title={t('banner.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting ? bannerTitle(deleting) : '',
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
