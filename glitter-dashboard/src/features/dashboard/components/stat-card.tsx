'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    accent: 'pink' | 'blue' | 'amber' | 'emerald';
    hint?: string;
}

const ACCENTS = {
    pink: {
        iconColor: 'text-pink-600 dark:text-pink-300',
        iconBg: 'bg-pink-100 dark:bg-pink-500/15',
        strip: 'bg-pink-500 dark:bg-pink-400',
    },
    blue: {
        iconColor: 'text-blue-600 dark:text-blue-300',
        iconBg: 'bg-blue-100 dark:bg-blue-500/15',
        strip: 'bg-blue-500 dark:bg-blue-400',
    },
    amber: {
        iconColor: 'text-amber-600 dark:text-amber-300',
        iconBg: 'bg-amber-100 dark:bg-amber-500/15',
        strip: 'bg-amber-500 dark:bg-amber-400',
    },
    emerald: {
        iconColor: 'text-emerald-600 dark:text-emerald-300',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
        strip: 'bg-emerald-500 dark:bg-emerald-400',
    },
};

export function StatCard({ title, value, icon: Icon, accent, hint }: StatCardProps) {
    const style = ACCENTS[accent];
    return (
        <div className="relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${style.strip}`} />
            <div className="flex items-center gap-3 p-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
                    <Icon className={`size-5 ${style.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {title}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {hint && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {hint}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}