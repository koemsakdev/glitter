'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import { BannerImageUploader } from '@/features/settings/components/banner-image-uploader';
import {
    BilingualField,
    SettingsCard,
    TextField,
} from '@/features/settings/components/settings-shared';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import type { StoreBanner } from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

const LIST_HREF = '/dashboard/app-settings/banners';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

export function BannerFormView({ bannerId }: { bannerId?: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();
    const isEdit = Boolean(bannerId);

    const [form, setForm] = useState({
        imageUrl: '',
        titleEn: '',
        titleKm: '',
        href: '/products',
        enabled: true,
    });
    const patch = (p: Partial<typeof form>) =>
        setForm((prev) => ({ ...prev, ...p }));

    const seeded = useRef(false);
    useEffect(() => {
        if (!data || seeded.current) return;
        seeded.current = true;
        const banner = data.config.banners.find((b) => b.id === bannerId);
        setForm(
            banner
                ? {
                      imageUrl: banner.imageUrl,
                      titleEn: banner.titleEn,
                      titleKm: banner.titleKm,
                      href: banner.href,
                      enabled: banner.enabled,
                  }
                : {
                      imageUrl: '',
                      titleEn: '',
                      titleKm: '',
                      href: '/products',
                      enabled: true,
                  },
        );
    }, [data, bannerId]);

    function handleSave() {
        if (!form.imageUrl) {
            toast({
                title: 'Please upload a banner image',
                variant: 'destructive',
            });
            return;
        }
        if (!data) return;

        const banner: StoreBanner = {
            id: bannerId ?? newId(),
            imageUrl: form.imageUrl,
            titleEn: form.titleEn.trim(),
            titleKm: form.titleKm.trim(),
            href: form.href.trim() || '/products',
            enabled: form.enabled,
        };
        const exists = data.config.banners.some((b) => b.id === banner.id);
        const banners = exists
            ? data.config.banners.map((b) => (b.id === banner.id ? banner : b))
            : [...data.config.banners, banner];

        save.mutate(
            {
                config: { ...data.config, banners },
                settingId: data.settingId,
            },
            {
                onSuccess: () => {
                    toast({ title: 'Banner saved', variant: 'success' });
                    router.push(LIST_HREF);
                },
                onError: (error) =>
                    toast({
                        title: 'Could not save',
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    }),
            },
        );
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <SavingOverlay open={save.isPending} />

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href={LIST_HREF}>
                                <ArrowLeft className="size-4" />
                            </Link>
                        }
                    />
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {isEdit ? 'Edit banner' : 'Add banner'}
                    </h1>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={save.isPending}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    {save.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                    )}
                    {isEdit ? 'Save changes' : 'Add banner'}
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SettingsCard title="Image">
                        <BannerImageUploader
                            value={form.imageUrl}
                            onChange={(v) => patch({ imageUrl: v })}
                        />
                    </SettingsCard>
                </div>

                <div className="lg:col-span-1">
                    <SettingsCard title="Details">
                        <BilingualField
                            label="Caption (optional)"
                            en={form.titleEn}
                            km={form.titleKm}
                            onEn={(v) => patch({ titleEn: v })}
                            onKm={(v) => patch({ titleKm: v })}
                        />
                        <TextField
                            label="Links to"
                            value={form.href}
                            onChange={(v) => patch({ href: v })}
                            placeholder="/products"
                        />
                        <label className="flex cursor-pointer items-center gap-2">
                            <Switch
                                checked={form.enabled}
                                onCheckedChange={(v) =>
                                    patch({ enabled: Boolean(v) })
                                }
                                className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                            />
                            <span className="text-sm font-medium">
                                Show on storefront
                            </span>
                        </label>
                    </SettingsCard>
                </div>
            </div>
        </div>
    );
}
