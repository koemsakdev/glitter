import type { LucideIcon } from 'lucide-react';

/** A profile summary tile: soft tinted icon · big value · label, with a large
 *  faint watermark of the same icon behind it for depth. */
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
            className={`group relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm transition-all duration-200 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
                interactive
                    ? 'hover:-translate-y-1 hover:border-(--brand)/40 hover:shadow-lg hover:shadow-(--brand)/10'
                    : ''
            }`}
        >
            {/* Decorative watermark — a large, very faint icon in the corner */}
            <Icon className="pointer-events-none absolute -bottom-4 -right-3 size-24 text-(--brand)/5 transition-transform duration-300 group-hover:scale-110 dark:text-(--brand)/10" />

            {/* Soft tinted icon (not a button) */}
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-(--brand)/10 text-(--brand) sm:size-10">
                <Icon className="size-4.5 sm:size-5" />
            </span>

            <p
                title={full}
                className="relative mt-3 truncate text-xl font-extrabold tracking-tight tabular-nums text-zinc-900 sm:text-2xl dark:text-zinc-100"
            >
                {value}
            </p>
            <p className="relative truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
        </div>
    );
}
