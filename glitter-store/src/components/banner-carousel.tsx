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
import { useLang } from '@/lib/lang-context';
import { pick, type Lang } from '@/lib/locale';
import type { Banner } from '@/lib/types';

export function BannerCarousel({
    banners,
    lang: initialLang,
}: {
    banners: Banner[];
    lang: Lang;
}) {
    const { lang } = useLang(initialLang);
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
                                        className="block w-full"
                                        draggable={false}
                                    />
                                    {/* Text + button overlay — desktop only; on
                                        mobile the banner shows just the image. */}
                                    {hasOverlay && (
                                        <div className="absolute inset-0 hidden flex-col justify-end p-6 sm:flex sm:p-10">
                                            {/* Readability scrim */}
                                            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent dark:from-black/90 dark:via-black/45" />

                                            <div className="relative max-w-xl">
                                                {title && (
                                                    <h2 className="line-clamp-2 text-2xl font-black leading-[1.1] tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl">
                                                        {title}
                                                    </h2>
                                                )}
                                                {desc && (
                                                    <p className="mt-2.5 line-clamp-2 max-w-md text-sm text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] sm:text-base lg:text-lg">
                                                        {desc}
                                                    </p>
                                                )}
                                                {href && btn && (
                                                    <Link
                                                        href={href}
                                                        className="group/btn mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-(--brand) py-2.5 pl-6 pr-2.5 text-sm font-bold text-white shadow-lg shadow-black/30 ring-1 ring-white/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:brightness-110 active:scale-95"
                                                    >
                                                        {btn}
                                                        <span className="grid size-6 place-items-center rounded-full bg-white/25 transition-transform group-hover/btn:translate-x-0.5">
                                                            <svg
                                                                className="size-3.5"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M5 12h14M13 6l6 6-6 6" />
                                                            </svg>
                                                        </span>
                                                    </Link>
                                                )}
                                            </div>
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