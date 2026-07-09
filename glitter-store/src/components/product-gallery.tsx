'use client';

import { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Maximize2,
} from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { ImageLightbox } from '@/components/image-lightbox';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/lib/types';

export function ProductGallery({
    images,
    name,
}: {
    images: ProductImage[];
    name: string;
}) {
    const [idx, setIdx] = useState(0);
    const [lightbox, setLightbox] = useState<number | null>(null);
    const count = images.length;
    const mainUrl = count > 0 ? fileUrl(images[idx]?.imageUrl) : null;
    const lightboxImages = images.map((im) => ({
        src: fileUrl(im.imageUrl) ?? '',
        alt: name,
    }));

    return (
        <div className="max-lg:mx-auto max-sm:max-w-xs sm:max-lg:max-w-xl lg:sticky lg:top-24">
            <div className="group relative aspect-square w-full overflow-hidden rounded-3xl bg-zinc-100 shadow-sm dark:bg-zinc-800">
                {mainUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={mainUrl}
                        alt={name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-zinc-300">
                        <ImageIcon className="size-12" />
                    </div>
                )}

                {/* Click anywhere on the image to open the full-screen viewer */}
                {mainUrl && (
                    <button
                        type="button"
                        onClick={() => setLightbox(idx)}
                        aria-label="View full image"
                        className="absolute inset-0 cursor-zoom-in"
                    />
                )}

                {/* Zoom hint */}
                {mainUrl && (
                    <span className="pointer-events-none absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/85 text-zinc-700 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-zinc-900/85 dark:text-zinc-100">
                        <Maximize2 className="size-4" />
                    </span>
                )}

                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                setIdx((i) => (i - 1 + count) % count)
                            }
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100 dark:bg-zinc-900/90 dark:text-zinc-100"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIdx((i) => (i + 1) % count)}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100 dark:bg-zinc-900/90 dark:text-zinc-100"
                        >
                            <ChevronRight className="size-5" />
                        </button>
                        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                            {images.map((im, i) => (
                                <span
                                    key={im.id}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all',
                                        i === idx
                                            ? 'w-5 bg-white'
                                            : 'w-1.5 bg-white/60',
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {count > 1 && (
                <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                    {images.map((im, i) => {
                        const u = fileUrl(im.imageUrl);
                        return (
                            <button
                                key={im.id}
                                type="button"
                                onClick={() => setIdx(i)}
                                className={cn(
                                    'aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                                    i === idx
                                        ? 'border-(--brand)'
                                        : 'border-transparent opacity-60 hover:opacity-100',
                                )}
                            >
                                {u && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={u}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <ImageLightbox
                images={lightboxImages}
                initialIndex={lightbox}
                onClose={() => setLightbox(null)}
            />
        </div>
    );
}
