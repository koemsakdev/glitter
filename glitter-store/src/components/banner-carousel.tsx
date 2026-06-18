'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fileUrl } from '@/lib/api';
import { pick, type Lang } from '@/lib/locale';
import type { StoreBanner } from '@/lib/store-config';

export function BannerCarousel({
    banners,
    lang,
}: {
    banners: StoreBanner[];
    lang: Lang;
}) {
    const [index, setIndex] = useState(0);
    const count = banners.length;

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(
            () => setIndex((prev) => (prev + 1) % count),
            5000,
        );
        return () => clearInterval(timer);
    }, [count]);

    if (count === 0) return null;

    return (
        <div className="relative overflow-hidden rounded-(--ui-radius)">
            <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {banners.map((b) => (
                    <Link
                        key={b.id}
                        href={b.href || '/products'}
                        className="relative block w-full shrink-0"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={fileUrl(b.imageUrl) ?? ''}
                            alt={pick(lang, b.titleEn, b.titleKm)}
                            className="h-44 w-full object-cover sm:h-64"
                        />
                        {(b.titleEn || b.titleKm) && (
                            <span className="absolute bottom-3 left-4 rounded-(--ui-radius) bg-black/55 px-3 py-1 text-sm font-semibold text-white">
                                {pick(lang, b.titleEn, b.titleKm)}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {count > 1 && (
                <div className="absolute bottom-3 right-4 flex gap-1.5">
                    {banners.map((b, i) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={`size-2 rounded-full transition-colors ${
                                i === index ? 'bg-white' : 'bg-white/50'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
