'use client';

import type { ReactNode } from 'react';

interface DetailSectionProps {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}

/**
 * A card section with a header (title + optional description + optional action button)
 * and a content area. Used as a building block for detail pages.
 */
export function DetailSection({
  title,
  description,
  action,
  children,
}: DetailSectionProps) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
                {action}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

interface DetailFieldProps {
    label: string;
    children: ReactNode;
}

/**
 * A label + value pair for displaying a single field in a detail section.
 */
export function DetailField({ label, children }: DetailFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </dt>
            <dd className="text-sm text-foreground">{children}</dd>
        </div>
    );
}