'use client';

import { useEffect, useState } from 'react';
import { fileUrl } from '@/lib/api';
import { pick, type Lang } from '@/lib/locale';
import type { Advertisement } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** Renders active ads for a placement location and records views/clicks. */
export function AdSlot({
    location,
    lang,
    className,
}: {
    location: string;
    lang: Lang;
    className?: string;
}) {
    const [ads, setAds] = useState<Advertisement[]>([]);

    useEffect(() => {
        let active = true;

        function load(recordViews: boolean) {
            fetch(`${API_URL}/api/advertisements/placement/${location}`)
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((d: { data?: Advertisement[] }) => {
                    if (!active) return;
                    const list = d.data ?? [];
                    setAds(list);
                    if (recordViews) {
                        for (const ad of list) {
                            void fetch(
                                `${API_URL}/api/advertisements/${ad.id}/view`,
                                { method: 'POST' },
                            ).catch(() => {});
                        }
                    }
                })
                .catch(() => {});
        }

        load(true);

        // Live updates: refetch when ads change in the dashboard (no view spam).
        const source = new EventSource(`${API_URL}/api/realtime/events`);
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { entity?: string };
                if (data.entity === 'advertisements') load(false);
            } catch {
                // ignore malformed events
            }
        };

        return () => {
            active = false;
            source.close();
        };
    }, [location]);

    if (ads.length === 0) return null;

    function recordClick(id: string) {
        void fetch(`${API_URL}/api/advertisements/${id}/click`, {
            method: 'POST',
        }).catch(() => {});
    }

    return (
        <div className={className}>
            {ads.map((ad) => {
                const title = pick(lang, ad.titleEn, ad.titleKm);
                const content = pick(
                    lang,
                    ad.contentEn ?? '',
                    ad.contentKm ?? '',
                );
                const img = fileUrl(ad.imageUrl);
                const inner = (
                    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-pink-50 to-rose-50">
                        {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={img}
                                alt={title}
                                className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-52"
                            />
                        )}
                        {(title || content) && (
                            <div
                                className={
                                    img
                                        ? 'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-5 text-white'
                                        : 'p-6'
                                }
                            >
                                {title && (
                                    <h3 className="text-lg font-bold tracking-tight">
                                        {title}
                                    </h3>
                                )}
                                {content && (
                                    <p
                                        className={
                                            img
                                                ? 'mt-1 text-sm text-white/90'
                                                : 'mt-1 text-sm text-zinc-600 dark:text-zinc-300'
                                        }
                                    >
                                        {content}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

                return ad.linkUrl ? (
                    <a
                        key={ad.id}
                        href={ad.linkUrl}
                        onClick={() => recordClick(ad.id)}
                        className="block"
                    >
                        {inner}
                    </a>
                ) : (
                    <div key={ad.id}>{inner}</div>
                );
            })}
        </div>
    );
}
