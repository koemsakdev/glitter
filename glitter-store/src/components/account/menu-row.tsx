import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

/** A settings-menu row: tinted icon · label (+ optional subtitle) · chevron. */
export function MenuRow({
    icon: Icon,
    title,
    subtitle,
    href,
    onClick,
}: {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    href?: string;
    onClick?: () => void;
}) {
    const cls =
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800';
    const inner = (
        <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--brand)/10 text-(--brand)">
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                </span>
                {subtitle && (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </span>
                )}
            </span>
            <ChevronRight className="size-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
        </>
    );
    return href ? (
        <Link href={href} className={cls}>
            {inner}
        </Link>
    ) : (
        <button type="button" onClick={onClick} className={cls}>
            {inner}
        </button>
    );
}
