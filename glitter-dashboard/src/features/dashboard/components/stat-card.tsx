'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    accent: 'pink' | 'blue' | 'amber' | 'emerald';
    hint?: string;
    /** Period-over-period change (%). Null/undefined hides the chip. */
    trend?: number | null;
}

const ACCENTS = {
    pink: {
        card: 'from-pink-50 to-white border-pink-200/70 dark:from-pink-500/10 dark:to-card dark:border-pink-500/20',
        iconTile: 'bg-pink-500 shadow-pink-500/30',
        glow: 'bg-pink-500/25',
    },
    blue: {
        card: 'from-blue-50 to-white border-blue-200/70 dark:from-blue-500/10 dark:to-card dark:border-blue-500/20',
        iconTile: 'bg-blue-500 shadow-blue-500/30',
        glow: 'bg-blue-500/25',
    },
    amber: {
        card: 'from-amber-50 to-white border-amber-200/70 dark:from-amber-500/10 dark:to-card dark:border-amber-500/20',
        iconTile: 'bg-amber-500 shadow-amber-500/30',
        glow: 'bg-amber-500/25',
    },
    emerald: {
        card: 'from-emerald-50 to-white border-emerald-200/70 dark:from-emerald-500/10 dark:to-card dark:border-emerald-500/20',
        iconTile: 'bg-emerald-500 shadow-emerald-500/30',
        glow: 'bg-emerald-500/25',
    },
};

export function StatCard({
    title,
    value,
    icon: Icon,
    accent,
    hint,
    trend,
}: StatCardProps) {
    const s = ACCENTS[accent];
    const up = (trend ?? 0) >= 0;
    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${s.card}`}
        >
            {/* Soft accent glow on hover */}
            <div
                className={`pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-2xl opacity-40 transition-opacity duration-300 group-hover:opacity-80 ${s.glow}`}
            />

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
                        {typeof value === 'number'
                            ? value.toLocaleString()
                            : value}
                    </p>
                </div>
                <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${s.iconTile}`}
                >
                    <Icon className="size-5" />
                </div>
            </div>

            {(hint || trend != null) && (
                <div className="relative mt-3 flex items-center gap-2">
                    {trend != null && (
                        <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                                up
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            }`}
                        >
                            {up ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}%
                        </span>
                    )}
                    {hint && (
                        <span className="truncate text-xs text-muted-foreground">
                            {hint}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
