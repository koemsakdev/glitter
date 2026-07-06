'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;

export const SheetContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
            data-slot="sheet-overlay"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        />
        <DialogPrimitive.Content
            ref={ref}
            data-slot="sheet-content"
            className={cn(
                'fixed inset-y-0 right-0 z-50 flex h-full w-80 max-w-[88%] flex-col overflow-y-auto bg-white p-5 shadow-2xl outline-none dark:bg-zinc-900',
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-500 outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="size-5" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;
