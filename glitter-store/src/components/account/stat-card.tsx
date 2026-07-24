import type { LucideIcon } from 'lucide-react';

/** A profile summary tile: gradient icon badge · big value · label. */
export function StatCard({
    icon: Icon,
    label,
    value,
    full,
    interactive,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    /** The full, un-shortened value — shown as a tooltip on hover. */
    full?: string;
    interactive?: boolean;
}) {
    return (
        <div
            className={`group rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition-all duration-200 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
                interactive
                    ? 'hover:-translate-y-1 hover:border-(--brand)/40 hover:shadow-lg hover:shadow-(--brand)/5'
                    : ''
            }`}
        >
            {/* Icon badge — gradient built from the system brand colour */}
            <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-(--brand) to-(--brand)/60 text-white shadow-lg shadow-(--brand)/30 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-110 sm:size-11">
                <Icon className="size-5" />
            </span>
            <p
                title={full}
                className="mt-2.5 truncate text-xl font-extrabold tracking-tight tabular-nums text-zinc-900 sm:mt-3 sm:text-2xl dark:text-zinc-100"
            >
                {value}
            </p>
            <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
        </div>
    );
}
