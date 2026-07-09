'use client';

import { useState } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useI18n, type TranslationKey } from '@/lib/i18n';

export interface DateRange {
    from: string;
    to: string;
}

const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
    ).padStart(2, '0')}`;

const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

/** Preset windows. All ranges end today; "all" reaches far back → monthly chart. */
export const RANGE_PRESETS: {
    key: string;
    label: TranslationKey;
    range: () => DateRange;
}[] = [
    { key: '7d', label: 'dashboard.range.7d', range: () => ({ from: iso(daysAgo(6)), to: iso(new Date()) }) },
    { key: '30d', label: 'dashboard.range.30d', range: () => ({ from: iso(daysAgo(29)), to: iso(new Date()) }) },
    { key: '90d', label: 'dashboard.range.90d', range: () => ({ from: iso(daysAgo(89)), to: iso(new Date()) }) },
    {
        key: 'month',
        label: 'dashboard.range.month',
        range: () => {
            const n = new Date();
            return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1)), to: iso(n) };
        },
    },
    {
        key: 'year',
        label: 'dashboard.range.year',
        range: () => {
            const n = new Date();
            return { from: iso(new Date(n.getFullYear(), 0, 1)), to: iso(n) };
        },
    },
    { key: 'all', label: 'dashboard.range.all', range: () => ({ from: '2000-01-01', to: iso(new Date()) }) },
];

export function DateRangeFilter({
    value,
    onChange,
}: {
    value: string;
    onChange: (presetKey: string, range: DateRange) => void;
}) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const current = RANGE_PRESETS.find((p) => p.key === value) ?? RANGE_PRESETS[1];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                        <CalendarDays className="size-3.5 text-muted-foreground" />
                        {t(current.label)}
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                }
            />
            <PopoverContent align="end" className="w-44 p-1">
                {RANGE_PRESETS.map((p) => {
                    const active = p.key === value;
                    return (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                                onChange(p.key, p.range());
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent ${
                                active ? 'font-semibold text-pink-600 dark:text-pink-300' : ''
                            }`}
                        >
                            {t(p.label)}
                            {active && <Check className="size-4" />}
                        </button>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}
