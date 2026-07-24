import type { ReactNode } from 'react';

/** A titled card with a divided list of rows (settings, providers, etc.). */
export function SectionCard({
    title,
    note,
    children,
}: {
    title: string;
    note?: string;
    children: ReactNode;
}) {
    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {title}
                </p>
                {note && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {note}
                    </p>
                )}
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {children}
            </div>
        </div>
    );
}
