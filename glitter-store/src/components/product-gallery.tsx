'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
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
    const scroller = useRef<HTMLDivElement>(null);
    const thumbs = useRef<HTMLDivElement>(null);
    const count = images.length;

    // Keep the active thumbnail scrolled into view as the user swipes.
    useEffect(() => {
        const el = thumbs.current?.children[idx] as HTMLElement | undefined;
        el?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
        });
    }, [idx]);
    const lightboxImages = images.map((im) => ({
        src: fileUrl(im.imageUrl) ?? '',
        alt: name,
    }));

    // Scroll the carousel to a slide (used by thumbnails + arrows).
    function goTo(i: number) {
        const el = scroller.current;
        if (!el) return;
        const clamped = Math.max(0, Math.min(count - 1, i));
        el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    }

    // Keep the active index in sync with the user's swipe.
    function onScroll() {
        const el = scroller.current;
        if (!el) return;
        const i = Math.round(el.scrollLeft / el.clientWidth);
        if (i !== idx) setIdx(i);
    }

    return (
        <div className="w-full min-w-0 sm:mx-auto sm:max-w-md lg:mx-0 lg:max-w-none lg:sticky lg:top-24">
            {/* Swipeable image viewer */}
            <div className="group relative overflow-hidden rounded-2xl bg-zinc-100 shadow-sm md:rounded-3xl dark:bg-zinc-800">
                {count > 0 ? (
                    <div
                        ref={scroller}
                        onScroll={onScroll}
                        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
                    >
                        {images.map((im, i) => {
                            const u = fileUrl(im.imageUrl);
                            return (
                                <button
                                    key={im.id}
                                    type="button"
                                    onClick={() => setLightbox(i)}
                                    aria-label="View full image"
                                    className="relative aspect-square w-full shrink-0 cursor-zoom-in snap-center"
                                >
                                    {u && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={u}
                                            alt={name}
                                            className="size-full object-cover transition-transform duration-500 group-hover:scale-102"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex aspect-square items-center justify-center text-zinc-300">
                        <ImageIcon className="size-12" />
                    </div>
                )}

                {/* Image counter — makes the full count obvious */}
                {count > 1 && (
                    <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur">
                        {idx + 1}/{count}
                    </span>
                )}

                {count > 1 && (
                    <>
                        {/* Prev / next — desktop hover (mobile uses swipe) */}
                        <button
                            type="button"
                            onClick={() => goTo(idx - 1)}
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100 max-md:hidden dark:bg-zinc-900/90 dark:text-zinc-100"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo(idx + 1)}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 opacity-0 shadow-md backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100 max-md:hidden dark:bg-zinc-900/90 dark:text-zinc-100"
                        >
                            <ChevronRight className="size-5" />
                        </button>

                        {/* Dots */}
                        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                            {images.map((im, i) => (
                                <span
                                    key={im.id}
                                    className={cn(
                                        'h-1.5 rounded-full shadow-sm transition-all',
                                        i === idx
                                            ? 'w-5 bg-(--brand)'
                                            : 'w-1.5 bg-zinc-900/30',
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails — horizontally scrollable strip (active one auto-scrolls
                into view). */}
            {count > 1 && (
                <div
                    ref={thumbs}
                    className="mt-3 flex gap-2.5 overflow-x-auto scroll-smooth pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
                >
                    {images.map((im, i) => {
                        const u = fileUrl(im.imageUrl);
                        return (
                            <button
                                key={im.id}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`View image ${i + 1}`}
                                className={cn(
                                    'aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 transition-all dark:bg-zinc-800',
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
