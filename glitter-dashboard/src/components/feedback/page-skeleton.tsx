'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder shaped like a typical dashboard page (title, toolbar, table),
 * so the layout appears immediately and the content fills in — no
 * full-screen spinner.
 */
export function PageSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                </div>
                <Skeleton className="h-9 w-64 rounded-full" />
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
                    {[40, 24, 20, 16].map((w, i) => (
                        <Skeleton
                            key={i}
                            className="h-3"
                            style={{ width: `${w}%` }}
                        />
                    ))}
                </div>
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0"
                    >
                        <Skeleton className="size-10 shrink-0 rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-2/5" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Placeholder shaped like the Dashboard home: stat cards, chart, lists. */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="space-y-3 rounded-2xl border bg-card p-5"
                    >
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="size-11 rounded-xl" />
                        </div>
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-4 rounded-2xl border bg-card p-5 lg:col-span-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>
                <div className="space-y-3 rounded-2xl border bg-card p-5">
                    <Skeleton className="h-4 w-28" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-lg" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-2.5 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-3 rounded-2xl border bg-card p-5">
                <Skeleton className="h-4 w-36" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
