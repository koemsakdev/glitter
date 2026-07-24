import type { LucideIcon } from 'lucide-react';

/** A small pill showing an icon + short text (phone, email, etc.). */
export function Chip({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Icon className="size-3.5" />
            {text}
        </span>
    );
}
