'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function parseISO(value: string): Date | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Local date → 'YYYY-MM-DD' (no timezone shift). */
function toISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

interface DatePickerProps {
    /** 'YYYY-MM-DD' or '' */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    fromYear?: number;
    toYear?: number;
    className?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder,
    fromYear,
    toYear,
    className,
}: DatePickerProps) {
    const { t, language } = useI18n();
    const locale = language === 'km' ? 'km-KH' : 'en-US';
    const selected = parseISO(value);
    const today = new Date();

    const [open, setOpen] = useState(false);
    const [view, setView] = useState<Date>(() => selected ?? today);

    const year = view.getFullYear();
    const month = view.getMonth();
    const currentYear = today.getFullYear();
    const startYear = fromYear ?? currentYear - 100;
    const endYear = toYear ?? currentYear + 10;

    const years = useMemo(() => {
        const arr: number[] = [];
        for (let y = endYear; y >= startYear; y--) arr.push(y);
        return arr;
    }, [startYear, endYear]);

    const months = useMemo(
        () =>
            Array.from({ length: 12 }, (_, m) =>
                new Intl.DateTimeFormat(locale, { month: 'long' }).format(
                    new Date(2020, m, 1),
                ),
            ),
        [locale],
    );

    const weekdays = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) =>
                new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(
                    new Date(2023, 0, 1 + i), // Jan 1 2023 = Sunday
                ),
            ),
        [locale],
    );

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const displayLabel = selected
        ? new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          }).format(selected)
        : null;

    function pickDay(day: number) {
        onChange(toISO(new Date(year, month, day)));
        setOpen(false);
    }
    function goToday() {
        setView(today);
        onChange(toISO(today));
        setOpen(false);
    }
    function clear() {
        onChange('');
        setOpen(false);
    }

    const navCls =
        'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                className={cn(
                    'flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm outline-none transition-colors hover:border-pink-300 focus:border-pink-500 data-popup-open:border-pink-500 dark:hover:border-pink-800 dark:focus:border-pink-800',
                    className,
                )}
            >
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span
                    className={cn(
                        'flex-1 truncate',
                        !displayLabel && 'text-muted-foreground',
                    )}
                >
                    {displayLabel ?? placeholder ?? t('common.pickDate')}
                </span>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto gap-3 p-3">
                {/* Header: prev · month · year · next */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setView(new Date(year, month - 1, 1))}
                        className={navCls}
                        aria-label="previous month"
                    >
                        <ChevronLeft className="size-4" />
                    </button>

                    <Select
                        value={String(month)}
                        onValueChange={(v) =>
                            setView(new Date(year, Number(v), 1))
                        }
                    >
                        <SelectTrigger size="sm" className="h-8 flex-1">
                            <SelectValue>
                                {(v) => months[Number(v)]}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((name, m) => (
                                <SelectItem key={m} value={String(m)}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={String(year)}
                        onValueChange={(v) =>
                            setView(new Date(Number(v), month, 1))
                        }
                    >
                        <SelectTrigger size="sm" className="h-8 w-22">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <button
                        type="button"
                        onClick={() => setView(new Date(year, month + 1, 1))}
                        className={navCls}
                        aria-label="next month"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                    {weekdays.map((w, i) => (
                        <div key={i} className="py-1">
                            {w}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, i) => {
                        if (day === null) return <div key={i} />;
                        const cellDate = new Date(year, month, day);
                        const isSelected = selected && sameDay(selected, cellDate);
                        const isToday = sameDay(today, cellDate);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => pickDay(day)}
                                className={cn(
                                    'flex size-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent',
                                    isSelected &&
                                        'bg-pink-500 font-semibold text-white hover:bg-pink-500 dark:bg-pink-600 dark:hover:bg-pink-600',
                                    !isSelected &&
                                        isToday &&
                                        'font-semibold text-pink-600 ring-1 ring-inset ring-pink-300 dark:text-pink-300 dark:ring-pink-700',
                                )}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-2">
                    <button
                        type="button"
                        onClick={clear}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                        {t('common.clear')}
                    </button>
                    <button
                        type="button"
                        onClick={goToday}
                        className="rounded-md px-2 py-1 text-xs font-medium text-pink-600 transition-colors hover:bg-pink-50 dark:text-pink-300 dark:hover:bg-pink-500/10"
                    >
                        {t('common.today')}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
