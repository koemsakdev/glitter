'use client';

import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BannerImageUploader } from '@/features/settings/components/banner-image-uploader';
import {
    BilingualField,
    SettingsCard,
    SettingsPage,
    TextField,
} from '@/features/settings/components/settings-shared';
import type { StoreBanner } from '@/features/settings/store-config';

function blankBanner(): StoreBanner {
    return {
        id:
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()),
        imageUrl: '',
        titleEn: '',
        titleKm: '',
        href: '/products',
        enabled: true,
    };
}

export default function BannersSettingsPage() {
    return (
        <SettingsPage
            title="Banners"
            subtitle="Promo banners shown at the top of the storefront home page"
        >
            {({ config, setConfig }) => {
                const banners = config.banners;
                const update = (id: string, patch: Partial<StoreBanner>) =>
                    setConfig((prev) => ({
                        ...prev,
                        banners: prev.banners.map((b) =>
                            b.id === id ? { ...b, ...patch } : b,
                        ),
                    }));
                const remove = (id: string) =>
                    setConfig((prev) => ({
                        ...prev,
                        banners: prev.banners.filter((b) => b.id !== id),
                    }));
                const add = () =>
                    setConfig((prev) => ({
                        ...prev,
                        banners: [...prev.banners, blankBanner()],
                    }));
                const move = (index: number, dir: -1 | 1) =>
                    setConfig((prev) => {
                        const next = [...prev.banners];
                        const target = index + dir;
                        if (target < 0 || target >= next.length) return prev;
                        [next[index], next[target]] = [
                            next[target],
                            next[index],
                        ];
                        return { ...prev, banners: next };
                    });

                return (
                    <SettingsCard title="Banners">
                        {banners.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No banners yet. Add one to show a promo image on
                                the storefront home page.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {banners.map((b, i) => (
                                    <div
                                        key={b.id}
                                        className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                Banner {i + 1}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    disabled={i === 0}
                                                    onClick={() => move(i, -1)}
                                                >
                                                    <ChevronUp className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    disabled={
                                                        i === banners.length - 1
                                                    }
                                                    onClick={() => move(i, 1)}
                                                >
                                                    <ChevronDown className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() =>
                                                        update(b.id, {
                                                            enabled: !b.enabled,
                                                        })
                                                    }
                                                    title={
                                                        b.enabled
                                                            ? 'Hide'
                                                            : 'Show'
                                                    }
                                                >
                                                    {b.enabled ? (
                                                        <Eye className="size-4" />
                                                    ) : (
                                                        <EyeOff className="size-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => remove(b.id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <BannerImageUploader
                                            value={b.imageUrl}
                                            onChange={(url) =>
                                                update(b.id, { imageUrl: url })
                                            }
                                        />
                                        <BilingualField
                                            label="Caption (optional)"
                                            en={b.titleEn}
                                            km={b.titleKm}
                                            onEn={(v) =>
                                                update(b.id, { titleEn: v })
                                            }
                                            onKm={(v) =>
                                                update(b.id, { titleKm: v })
                                            }
                                        />
                                        <TextField
                                            label="Links to"
                                            value={b.href}
                                            onChange={(v) =>
                                                update(b.id, { href: v })
                                            }
                                            placeholder="/products"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={add}
                            className="mt-3"
                        >
                            <Plus className="mr-2 size-4" />
                            Add banner
                        </Button>
                    </SettingsCard>
                );
            }}
        </SettingsPage>
    );
}
