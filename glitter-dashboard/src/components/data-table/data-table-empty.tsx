'use client';

import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface DataTableEmptyProps {
    icon?: ReactNode;
    title?: string;
    description?: string;
    action?: ReactNode;
}

export function DataTableEmpty({
                                   icon,
                                   title = 'No data',
                                   description,
                                   action,
                               }: DataTableEmptyProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                {icon ?? <Inbox className="size-6 text-muted-foreground/60" />}
            </div>
            <div>
                <h3 className="text-base font-semibold">{title}</h3>
                {description && (
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}