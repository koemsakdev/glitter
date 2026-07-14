'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/**
 * A responsive modal — a centered dialog on desktop and a bottom sheet on
 * mobile — mirroring the dashboard's ResponsiveModal API (open / onOpenChange /
 * className). Built on Radix Dialog so focus, escape and scroll-lock are handled.
 */
export function ResponsiveModal({
    open,
    onOpenChange,
    className,
    title,
    dismissible = true,
    centered = false,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
    /** Accessible dialog title (visually hidden). */
    title?: string;
    /** When false, Escape and clicking the backdrop won't close the modal. */
    dismissible?: boolean;
    /** Force a centered dialog on every screen (no mobile bottom sheet). */
    centered?: boolean;
    children: React.ReactNode;
}) {
    const lock = dismissible
        ? {}
        : {
              onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
              onInteractOutside: (e: Event) => e.preventDefault(),
          };
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    {...lock}
                    className={cn(
                        'fixed z-9999 flex flex-col overflow-y-auto bg-white shadow-2xl outline-none dark:bg-zinc-900',
                        centered
                            ? // Centered dialog on every screen.
                              'left-1/2 top-1/2 max-h-[85vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl'
                            : // Mobile: bottom sheet · Desktop: centered dialog.
                              'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
                        className,
                    )}
                >
                    <DialogPrimitive.Title className="sr-only">
                        {title ?? 'Dialog'}
                    </DialogPrimitive.Title>
                    {children}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
