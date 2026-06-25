'use client';

import { Eye, Loader, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { AdFormDialog } from '@/features/advertisements/advertisement-form-dialog';
import {
    useAdvertisements,
    useCreateAdvertisement,
    useDeleteAdvertisement,
    useUpdateAdvertisement,
} from '@/features/advertisements/use-advertisements';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    type Advertisement,
    type AdvertisementFormValues,
    type AdStatus,
    type PlacementLocation,
} from '@/types/advertisement';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
function imgUrl(path: string | null): string | null {
    if (!path) return null;
    return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

const STATUS_LABEL: Record<AdStatus, TranslationKey> = {
    active: 'ad.status.active',
    inactive: 'ad.status.inactive',
    scheduled: 'ad.status.scheduled',
    archived: 'ad.status.archived',
};
const STATUS_STYLE: Record<AdStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    inactive: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
    scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',
};
const PLACEMENT_LABEL: Record<PlacementLocation, TranslationKey> = {
    home_top: 'ad.placement.home_top',
    home_middle: 'ad.placement.home_middle',
    sidebar: 'ad.placement.sidebar',
    product_page: 'ad.placement.product_page',
    footer: 'ad.placement.footer',
};

export default function AdvertisementsPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const adTitle = (ad: Advertisement) =>
        (language === 'km' ? ad.titleKm : ad.titleEn) ||
        ad.titleEn ||
        ad.titleKm;
    const { data: ads = [], isLoading } = useAdvertisements();
    const create = useCreateAdvertisement();
    const update = useUpdateAdvertisement();
    const remove = useDeleteAdvertisement();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Advertisement | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Advertisement | null>(null);

    const pending = create.isPending || update.isPending;

    function openForm(item: Advertisement | null) {
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

    function handleSubmit(values: AdvertisementFormValues) {
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
                            {t('ad.title.page')}
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
                        {t('ad.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('ad.add')}
                </Button>
            </div>

            {ads.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('ad.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {ads.map((ad) => {
                        const src = imgUrl(ad.imageUrl);
                        return (
                            <div
                                key={ad.id}
                                className="flex gap-3 rounded-xl border bg-card p-3"
                            >
                                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                                    {src && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={src}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-sm font-medium">
                                            {adTitle(ad)}
                                        </p>
                                        <span
                                            className={cn(
                                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                                STATUS_STYLE[ad.status],
                                            )}
                                        >
                                            {t(STATUS_LABEL[ad.status])}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {ad.placements.map((p) => (
                                            <span
                                                key={p}
                                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                            >
                                                {t(PLACEMENT_LABEL[p])}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <Eye className="size-3.5" />
                                            {ad.viewCount}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <MousePointerClick className="size-3.5" />
                                            {ad.clickCount}
                                        </span>
                                        <span className="ml-auto flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openForm(ad)}
                                                className="rounded-md p-1 hover:bg-accent hover:text-foreground"
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleting(ad)}
                                                className="rounded-md p-1 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AdFormDialog
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
                title={t('ad.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting ? adTitle(deleting) : '',
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
