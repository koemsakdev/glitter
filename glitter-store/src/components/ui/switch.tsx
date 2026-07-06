'use client';

import { cn } from '@/lib/utils';

/** Minimal iOS-style toggle switch. */
export function Switch({
    checked,
    onCheckedChange,
    className,
    'aria-label': ariaLabel,
}: {
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
    className?: string;
    'aria-label'?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'relative inline-flex h-7.75 w-12.75 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out',
                checked ? 'bg-(--brand)' : 'bg-zinc-200 dark:bg-zinc-700',
                className,
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block size-6.75 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-in-out',
                    checked ? 'translate-x-5.5' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}
