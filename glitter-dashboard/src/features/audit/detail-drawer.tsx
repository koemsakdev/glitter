'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

/**
 * Log details in a shadcn Drawer, styled like the docs' Base UI drawer: a
 * floating card that slides in from the right (inset from the edges, fully
 * rounded), a strongly blurred page behind, title + description, a scrolling
 * body of cards, and full-width stacked actions at the bottom.
 */
export function DetailDrawer({
    open,
    onOpenChange,
    title,
    description,
    footer,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    /** Stacked full-width buttons: primary first, then Close/Cancel. */
    footer?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent
                overlayClassName="bg-black/25 backdrop-blur-md supports-backdrop-filter:backdrop-blur-md"
                className="data-[vaul-drawer-direction=right]:inset-y-2 data-[vaul-drawer-direction=right]:right-2 data-[vaul-drawer-direction=right]:h-[calc(100dvh-1rem)] data-[vaul-drawer-direction=right]:w-[calc(100vw-1rem)] data-[vaul-drawer-direction=right]:rounded-3xl data-[vaul-drawer-direction=right]:border data-[vaul-drawer-direction=right]:shadow-2xl data-[vaul-drawer-direction=right]:sm:max-w-md"
            >
                <DrawerHeader className="gap-1 px-5 pt-5 pb-3 text-left md:gap-1">
                    <DrawerTitle className="text-lg font-semibold">
                        {title}
                    </DrawerTitle>
                    {description && (
                        <DrawerDescription className="text-sm">
                            {description}
                        </DrawerDescription>
                    )}
                </DrawerHeader>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3">
                    {children}
                </div>
                {footer && (
                    <DrawerFooter className="gap-2.5 px-5 pt-3 pb-5 [&_a]:w-full [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl">
                        {footer}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

/** Status card at the top of a drawer. */
export function DetailHero({
    icon: Icon,
    tone,
    title,
    subtitle,
    aside,
}: {
    icon: LucideIcon;
    tone: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
    title: ReactNode;
    subtitle?: ReactNode;
    aside?: ReactNode;
}) {
    const tones = {
        success:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
        danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
        warning:
            'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
        neutral: 'bg-muted/50 text-foreground border-border',
        info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20',
    }[tone];
    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-2xl border p-4',
                tones,
            )}
        >
            <Icon className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="font-semibold">{title}</div>
                {subtitle && (
                    <div className="text-sm opacity-80">{subtitle}</div>
                )}
            </div>
            {aside}
        </div>
    );
}

/** A card with a small heading, rows and optional header actions. */
export function DetailSection({
    icon: Icon,
    title,
    action,
    children,
}: {
    icon: LucideIcon;
    title: string;
    /** Small buttons on the right of the card heading (e.g. Copy). */
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card px-4 py-3.5">
            <div className="mb-1.5 flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{title}</span>
                {action && <div className="ml-auto flex gap-1">{action}</div>}
            </div>
            <dl className="space-y-1.5">{children}</dl>
        </section>
    );
}

/** One label/value row inside a DetailSection (hidden when empty). */
export function DetailRow({
    label,
    value,
    mono,
}: {
    label: string;
    value: ReactNode;
    mono?: boolean;
}) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="flex gap-3 text-sm">
            <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    'min-w-0 flex-1 break-all',
                    mono && 'font-mono text-xs leading-5',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

/** Tiny icon button for a DetailSection heading. */
export function SectionButton({
    onClick,
    href,
    icon: Icon,
    label,
}: {
    onClick?: () => void;
    href?: string;
    icon: LucideIcon;
    label: string;
}) {
    const cls =
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
    return href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
            <Icon className="size-3.5" />
            {label}
        </a>
    ) : (
        <button type="button" onClick={onClick} className={cls}>
            <Icon className="size-3.5" />
            {label}
        </button>
    );
}
