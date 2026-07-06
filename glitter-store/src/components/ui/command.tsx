'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Command = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn(
            'flex w-full flex-col overflow-hidden rounded-md text-zinc-900 dark:text-zinc-100',
            className,
        )}
        {...props}
    />
));
Command.displayName = CommandPrimitive.displayName;

export const CommandInput = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Input>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
        onClear?: () => void;
    }
>(({ className, onClear, value, ...props }, ref) => (
    <div className="flex items-center gap-2.5 border-b border-zinc-100 px-3.5 dark:border-zinc-800">
        <Search className="size-4 shrink-0 text-zinc-400" />
        <CommandPrimitive.Input
            ref={ref}
            value={value}
            className={cn(
                'flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400 disabled:opacity-50',
                className,
            )}
            {...props}
        />
        {onClear && value ? (
            <button
                type="button"
                onClick={onClear}
                aria-label="Clear"
                className="shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
                <X className="size-4" />
            </button>
        ) : null}
    </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

export const CommandList = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.List
        ref={ref}
        className={cn('max-h-64 overflow-y-auto overflow-x-hidden p-1', className)}
        {...props}
    />
));
CommandList.displayName = CommandPrimitive.List.displayName;

export const CommandEmpty = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Empty>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
    <CommandPrimitive.Empty
        ref={ref}
        className="py-6 text-center text-sm text-zinc-400"
        {...props}
    />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

export const CommandGroup = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Group>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={cn(
            'p-0 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wide **:[[cmdk-group-heading]]:text-zinc-400',
            className,
        )}
        {...props}
    />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

export const CommandItem = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={cn(
            'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-pink-50 dark:data-[selected=true]:bg-pink-500/10',
            className,
        )}
        {...props}
    />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;
