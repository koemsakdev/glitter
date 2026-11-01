'use client';

import { useEffect, useState } from 'react';
import { tr, type Lang } from '@/lib/locale';

/** Live countdown to the "expected back" time on the maintenance page. */
export function MaintenanceCountdown({
    endsAt,
    lang,
}: {
    endsAt: string;
    lang: Lang;
}) {
    const target = new Date(endsAt).getTime();
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Before the first tick (server render) show nothing — avoids a mismatch.
    if (now === null) return <div className="h-[76px]" />;

    const left = Math.max(0, target - now);
    if (left === 0) {
        return (
            <p className="text-base font-semibold text-white">
                {tr(lang, 'mtAnyMinute')}
            </p>
        );
    }
    const s = Math.floor(left / 1000);
    const parts = [
        { v: Math.floor(s / 86400), k: 'mtDays' },
        { v: Math.floor((s % 86400) / 3600), k: 'mtHours' },
        { v: Math.floor((s % 3600) / 60), k: 'mtMinutes' },
        { v: s % 60, k: 'mtSeconds' },
    ].filter((p, i) => i > 0 || p.v > 0); // hide "0 days"

    return (
        <div className="flex justify-center gap-2.5 md:justify-start">
            {parts.map((p) => (
                <div
                    key={p.k}
                    className="flex w-[68px] flex-col items-center rounded-2xl bg-white/12 py-2.5 ring-1 ring-white/20 backdrop-blur-sm"
                >
                    <span className="text-2xl font-bold tabular-nums leading-none">
                        {String(p.v).padStart(2, '0')}
                    </span>
                    <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                        {tr(lang, p.k)}
                    </span>
                </div>
            ))}
        </div>
    );
}
