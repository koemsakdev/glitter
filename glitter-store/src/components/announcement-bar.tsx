'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { pick, tr, type Lang } from '@/lib/locale';
import type { PublicPromo } from '@/lib/api';
import type { Announcement } from '@/lib/store-config';

const DISMISS_KEY = 'glitter:dismissed-announcements';

/** Readable text colour (#fff / #111) for a given hex background. */
function readableText(bg?: string | null): string | undefined {
    if (!bg) return undefined;
    const hex = bg.trim().replace('#', '');
    const full =
        hex.length === 3
            ? hex
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : hex;
    if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return undefined;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // Perceived luminance — dark text on light backgrounds, white otherwise.
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
}

/** Local 'YYYY-MM-DD' (not UTC) so date windows match the admin's local dates. */
function todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** End of the announcement's last visible day (inclusive), in local time. */
function endTarget(endAt: string): number {
    return new Date(`${endAt.slice(0, 10)}T23:59:59`).getTime();
}

/** Live message generated from a promotion — matches the dashboard generator. */
function promoText(p: PublicPromo, lang: Lang): string {
    const amount =
        p.discountType === 'percent'
            ? `${p.discountValue}%`
            : `$${p.discountValue}`;
    const freeDelivery = p.discountType === 'percent' && p.discountValue >= 100;
    if (lang === 'km') {
        const min = p.minSpend > 0 ? ` សម្រាប់ការទិញលើសពី $${p.minSpend}` : '';
        const code = p.code ? ` — ប្រើកូដ ${p.code}` : '';
        if (p.appliesTo === 'delivery') {
            const base = freeDelivery
                ? 'ដឹកជញ្ជូនឥតគិតថ្លៃ'
                : `បញ្ចុះថ្លៃដឹក ${amount}`;
            return `${base}${min}${code}`;
        }
        return `បញ្ចុះតម្លៃ ${amount}${min}${code}`;
    }
    const min = p.minSpend > 0 ? ` on orders over $${p.minSpend}` : '';
    const code = p.code ? ` — use code ${p.code}` : '';
    if (p.appliesTo === 'delivery') {
        const base = freeDelivery ? 'Free delivery' : `${amount} off delivery`;
        return `${base}${min}${code}`;
    }
    return `Get ${amount} off${min}${code}`;
}

interface Resolved {
    id: string;
    text: string;
    enabled: boolean;
    startAt: string | null;
    endAt: string | null;
    bgColor?: string | null;
    dismissible?: boolean;
}

function Countdown({ endAt, lang }: { endAt: string; lang: Lang }) {
    // Start null so SSR and the first client render match (no live time yet),
    // then tick after mount — avoids a hydration mismatch on the seconds.
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    if (now === null) return null;
    const remaining = endTarget(endAt) - now;
    if (remaining <= 0) return null;

    const totalSec = Math.floor(remaining / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums">
            <svg
                className="size-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            >
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2M9 2h6" />
            </svg>
            {tr(lang, 'endsIn')}{' '}
            {d > 0 && `${d}d `}
            {pad(h)}:{pad(m)}:{pad(s)}
        </span>
    );
}

export function AnnouncementBar({
    announcements,
    lang,
    promos = [],
}: {
    announcements: Announcement[];
    lang: Lang;
    promos?: PublicPromo[];
}) {
    const today = todayIso();
    const promoById = new Map(promos.map((p) => [p.id, p]));

    // Resolve each announcement: a linked one mirrors its live promotion
    // (message + end date) and disappears when that promo is no longer active.
    const resolved = announcements
        .map((a): Resolved | null => {
            if (a.voucherId) {
                const promo = promoById.get(a.voucherId);
                if (promo) {
                    return {
                        id: a.id,
                        text: promoText(promo, lang),
                        enabled: a.enabled,
                        startAt: null,
                        endAt: promo.endAt,
                        bgColor: a.bgColor,
                        dismissible: a.dismissible,
                    };
                }
                // Linked promo inactive/deleted → hide (once promos have loaded).
                if (promos.length > 0) return null;
            }
            return {
                id: a.id,
                text: pick(lang, a.textEn, a.textKm),
                enabled: a.enabled,
                startAt: a.startAt,
                endAt: a.endAt,
                bgColor: a.bgColor,
                dismissible: a.dismissible,
            };
        })
        .filter((r): r is Resolved => r !== null);

    // Dismissed ids are read after mount so SSR/first render stay identical.
    const [dismissed, setDismissed] = useState<string[]>([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DISMISS_KEY);
            if (raw) setDismissed(JSON.parse(raw) as string[]);
        } catch {
            /* ignore malformed storage */
        }
    }, []);

    const active = resolved.filter(
        (r) =>
            r.enabled &&
            r.text &&
            !dismissed.includes(r.id) &&
            (!r.startAt || r.startAt <= today) &&
            (!r.endAt || r.endAt >= today),
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

    const dismiss = () => {
        const next = [...new Set([...dismissed, current.id])];
        setDismissed(next);
        setIndex(0);
        try {
            localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    };

    const textColor = readableText(current.bgColor);

    return (
        <div
            className="relative flex items-center justify-center bg-(--brand) px-9 py-1.5 text-center text-[11px] font-medium text-white transition-opacity sm:text-xs"
            style={{
                backgroundColor: current.bgColor || undefined,
                color: textColor,
            }}
        >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                <span>{current.text}</span>
                {current.endAt && (
                    <Countdown endAt={current.endAt} lang={lang} />
                )}
            </div>
            {current.dismissible && (
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={tr(lang, 'dismiss')}
                    className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-black/10"
                    style={textColor ? { color: textColor } : undefined}
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}
