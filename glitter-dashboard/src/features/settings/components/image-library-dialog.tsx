'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreConfig } from '@/features/settings/use-settings';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import { listUploadedImages } from '@/lib/uploads';
import { cn } from '@/lib/utils';

const PAGE = 48;

/**
 * Pick an image that was uploaded before — e.g. to reuse a payment logo.
 * Logos already used in the checkout settings come first, then every past
 * upload (newest first). Nothing is uploaded again; the URL is reused.
 */
export function ImageLibraryDialog({
    open,
    current,
    onOpenChange,
    onChoose,
}: {
    open: boolean;
    /** The image currently set (shown as selected). */
    current?: string;
    onOpenChange: (open: boolean) => void;
    onChoose: (url: string) => void;
}) {
    const { t } = useI18n();
    const [shown, setShown] = useState(PAGE);
    const { data: config } = useStoreConfig();
    const uploads = useQuery({
        queryKey: ['uploads', 'images'],
        queryFn: listUploadedImages,
        enabled: open,
        staleTime: 60_000,
    });

    // Logos in use across payment / delivery / region settings.
    const inUse = useMemo(() => {
        const d = config?.config.delivery;
        const urls = [
            ...(d?.payments ?? []).map((p) => p.iconUrl),
            ...(d?.methods ?? []).map((m) => m.iconUrl),
            ...(d?.regions ?? []).map((r) => r.iconUrl),
        ].filter((u): u is string => Boolean(u));
        return [...new Set(urls)];
    }, [config]);
    const others = (uploads.data ?? [])
        .map((u) => u.url)
        .filter((u) => !inUse.includes(u));

    function Tile({ url }: { url: string }) {
        const active = url === current;
        return (
            <button
                type="button"
                onClick={() => {
                    onChoose(url);
                    onOpenChange(false);
                }}
                className={cn(
                    'relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border transition hover:ring-2 hover:ring-pink-400',
                    active && 'ring-2 ring-pink-500',
                )}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getFileUrl(url) ?? ''}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                />
                {active && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-pink-500 text-white">
                        <Check className="size-3" />
                    </span>
                )}
            </button>
        );
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-2xl"
        >
            <div className="flex max-h-[calc(100dvh-7.5rem)] flex-col min-[1027px]:max-h-[85vh]">
                <div className="border-b px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {t('library.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('library.hint')}
                    </p>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {inUse.length > 0 && (
                        <section className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('library.inUse')}
                            </p>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {inUse.map((u) => (
                                    <Tile key={u} url={u} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('library.all')}
                        </p>
                        {uploads.isLoading ? (
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        className="aspect-square rounded-xl"
                                    />
                                ))}
                            </div>
                        ) : others.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
                                <ImageOff className="size-6 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">
                                    {t('library.empty')}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                    {others.slice(0, shown).map((u) => (
                                        <Tile key={u} url={u} />
                                    ))}
                                </div>
                                {others.length > shown && (
                                    <div className="flex justify-center pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setShown((n) => n + PAGE)
                                            }
                                        >
                                            {t('library.more')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </ResponsiveModal>
    );
}
