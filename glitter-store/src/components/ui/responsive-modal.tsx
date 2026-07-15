'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';

/** True below the `md` breakpoint. Initialised synchronously (the modal only
 *  ever mounts client-side, on open) so there's no dialog→drawer flash. */
function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(max-width: 767px)').matches,
    );
    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const onChange = () => setIsMobile(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return isMobile;
}

/**
 * A responsive modal — a swipe-to-dismiss **drawer** (vaul) on mobile and a
 * centered **dialog** (Radix) on desktop, mirroring the dashboard's
 * ResponsiveModal. Pass `centered` to force a centered dialog on every screen
 * (used for small confirmations that shouldn't be a bottom sheet).
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
    /** When false, Escape / backdrop / swipe won't close the modal. */
    dismissible?: boolean;
    /** Force a centered dialog on every screen (no mobile drawer). */
    centered?: boolean;
    children: React.ReactNode;
}) {
    const isMobile = useIsMobile();

    // Mobile bottom sheet with a native swipe-to-dismiss gesture.
    if (isMobile && !centered) {
        return (
            <DrawerPrimitive.Root
                open={open}
                onOpenChange={onOpenChange}
                dismissible={dismissible}
            >
                <DrawerPrimitive.Portal>
                    <DrawerPrimitive.Overlay className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm" />
                    <DrawerPrimitive.Content
                        className={cn(
                            'fixed inset-x-0 bottom-0 z-9999 flex max-h-[92vh] flex-col rounded-t-3xl bg-white outline-none dark:bg-zinc-900',
                            className,
                        )}
                    >
                        <DrawerPrimitive.Title className="sr-only">
                            {title ?? 'Dialog'}
                        </DrawerPrimitive.Title>
                        {/* Grab handle (only when the sheet can be swiped away) */}
                        {dismissible && (
                            <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        )}
                        {children}
                    </DrawerPrimitive.Content>
                </DrawerPrimitive.Portal>
            </DrawerPrimitive.Root>
        );
    }

    // Desktop dialog (or a centered confirm on any screen).
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
                        'fixed left-1/2 top-1/2 z-9999 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none dark:bg-zinc-900',
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
