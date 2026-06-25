'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import { fileUrl } from '@/lib/api';
import { pick, type Lang } from '@/lib/locale';
import type { Banner } from '@/lib/types';

export function BannerCarousel({
    banners,
    lang,
}: {
    banners: Banner[];
    lang: Lang;
}) {
    const [active, setActive] = useState(0);

    if (banners.length === 0) return null;

    // The backdrop image tracks the active slide (like Legend's #img-bg swap).
    const bgImage = fileUrl(banners[active]?.imageUrl) ?? '';

    return (
        <section className="relative overflow-hidden">
            {/* One blurred backdrop behind everything — swaps with the active slide.
                Fades into the page above & below so the banner blends with the
                sections around it (no hard box). */}
            <div aria-hidden className="absolute inset-0">
                {bgImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={bgImage}
                        src={bgImage}
                        alt=""
                        className="size-full scale-110 object-cover blur-2xl"
                    />
                )}
                <div className="absolute inset-0 bg-black/10 dark:bg-black/70" />
                <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-background to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />
            </div>

            <div className="relative mx-auto max-w-6xl px-4 py-6 sm:py-10">
                <Swiper
                    modules={[Autoplay, Pagination]}
                    slidesPerView={1}
                    grabCursor
                    loop={banners.length > 1}
                    speed={1000}
                    autoplay={{ delay: 4000, disableOnInteraction: false }}
                    pagination={{ clickable: true }}
                    onSlideChange={(s: SwiperClass) => setActive(s.realIndex)}
                    className="banner-swiper overflow-hidden rounded-2xl"
                    style={
                        {
                            '--swiper-pagination-color': 'var(--brand)',
                            '--swiper-pagination-bullet-inactive-color': '#ffffff',
                            '--swiper-pagination-bullet-inactive-opacity': '0.6',
                            '--swiper-pagination-bottom': '14px',
                        } as CSSProperties
                    }
                >
                    {banners.map((b) => {
                        const title = pick(lang, b.titleEn, b.titleKm);
                        const desc = pick(
                            lang,
                            b.descriptionEn ?? '',
                            b.descriptionKm ?? '',
                        );
                        const btn = pick(
                            lang,
                            b.buttonLabelEn ?? '',
                            b.buttonLabelKm ?? '',
                        );
                        const href = b.linkUrl?.trim();
                        const img = fileUrl(b.imageUrl) ?? '';
                        const hasOverlay = Boolean(
                            title || desc || (href && btn),
                        );

                        return (
                            <SwiperSlide key={b.id}>
                                <div className="relative bg-zinc-200 dark:bg-zinc-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img}
                                        alt={b.imageAltText || title || 'Banner'}
                                        className="w-full object-cover"
                                        draggable={false}
                                    />
                                    {hasOverlay && (
                                        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/30 to-transparent p-5 sm:p-8 dark:from-black/90 dark:via-black/45">
                                            {title && (
                                                <h2 className="line-clamp-2 max-w-xl text-2xl font-extrabold leading-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl">
                                                    {title}
                                                </h2>
                                            )}
                                            {desc && (
                                                <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/95 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)] sm:text-base">
                                                    {desc}
                                                </p>
                                            )}
                                            {href && btn && (
                                                <Link
                                                    href={href}
                                                    className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-(--brand) px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-95"
                                                >
                                                    {btn}
                                                    <svg
                                                        className="size-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                                    </svg>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
        </section>
    );
}
