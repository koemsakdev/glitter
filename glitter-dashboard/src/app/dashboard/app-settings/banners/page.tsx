'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import type { StoreBanner } from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useToast } from '@/hooks/use-toast';

const BASE = '/dashboard/app-settings/banners';
const CONFIG_KEY = ['app-settings', 'store-config'] as const;

export default function BannersSettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    const [deleting, setDeleting] = useState<StoreBanner | null>(null);

    const banners = data?.config.banners ?? [];

    function persist(nextBanners: StoreBanner[]) {
        if (!data) return;
        const nextConfig = { ...data.config, banners: nextBanners };
        // Optimistic: update the cached config so the list reacts instantly.
        queryClient.setQueryData(CONFIG_KEY, {
            ...data,
            config: nextConfig,
        });
        save.mutate(
            { config: nextConfig, settingId: data.settingId },
            {
                onError: (error) => {
                    void queryClient.invalidateQueries({
                        queryKey: ['app-settings'],
                    });
                    toast({
                        title: 'Could not save',
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    });
                },
            },
        );
    }

    function toggle(b: StoreBanner) {
        persist(
            banners.map((x) =>
                x.id === b.id ? { ...x, enabled: !x.enabled } : x,
            ),
        );
    }

    function handleDelete() {
        if (!deleting) return;
        persist(banners.filter((b) => b.id !== deleting.id));
        setDeleting(null);
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Banners</h2>
                        {save.isPending && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="size-3 animate-spin" />
                                Saving…
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Promo banners shown in the storefront home carousel.
                    </p>
                </div>
                <Button
                    onClick={() => router.push(`${BASE}/new`)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    Add banner
                </Button>
            </div>

            {banners.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        No banners yet. Add one to show a promo on the storefront.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {banners.map((b) => {
                        const img = getFileUrl(b.imageUrl);
                        return (
                            <div
                                key={b.id}
                                className="overflow-hidden rounded-xl border bg-card"
                            >
                                <div className="h-40 bg-muted/30">
                                    {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={img}
                                            alt={b.titleEn || 'Banner'}
                                            className={`size-full object-cover ${
                                                b.enabled ? '' : 'opacity-40'
                                            }`}
                                        />
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <Switch
                                            checked={b.enabled}
                                            onCheckedChange={() => toggle(b)}
                                            className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                                        />
                                        <span className="text-sm font-medium">
                                            {b.enabled ? 'Active' : 'Hidden'}
                                        </span>
                                    </label>
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                router.push(`${BASE}/${b.id}`)
                                            }
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
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title="Delete banner?"
                description="This banner will be removed from the storefront."
                confirmLabel="Yes, delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={save.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
}
