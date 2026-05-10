'use client';

import type { ReactNode } from 'react';

interface DataTableToolbarProps {
    /** Slots for left side (filter tabs, etc.) */
    left?: ReactNode;
    /** Slots for right side (sort button, search, etc.) */
    right?: ReactNode;
}

export function DataTableToolbar({ left, right }: DataTableToolbarProps) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">{left}</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {right}
            </div>
        </div>
    );
}