'use client';

import { useEffect, useState } from 'react';
import { pick, type Lang } from '@/lib/locale';
import type { Announcement } from '@/lib/store-config';

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export function AnnouncementBar({
    announcements,
    lang,
}: {
    announcements: Announcement[];
    lang: Lang;
}) {
    const today = todayIso();
    const active = announcements.filter(
        (a) =>
            a.enabled &&
            (a.textEn || a.textKm) &&
            (!a.startAt || a.startAt <= today) &&
            (!a.endAt || a.endAt >= today),
    );

    const [index, setIndex] = useState(0);
    const count = active.length;

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(
            () => setIndex((i) => (i + 1) % count),
            5000,
        );
        return () => clearInterval(timer);
    }, [count]);

    if (count === 0) return null;
    const current = active[index % count];

    return (
        <div className="bg-(--brand) px-4 py-1.5 text-center text-xs font-medium text-white transition-opacity">
            {pick(lang, current.textEn, current.textKm)}
        </div>
    );
}
