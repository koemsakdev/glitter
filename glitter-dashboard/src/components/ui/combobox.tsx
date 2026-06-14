'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
    value: string;
    label: string;
    secondary?: string;
    /** Optional leading visual (image thumbnail, color swatch, icon). */
    leading?: React.ReactNode;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
}

export function Combobox({
     options,
     value,
     onChange,
     placeholder = 'Select...',
     searchPlaceholder = 'Search...',
     emptyMessage = 'No results found',
     disabled,
     isLoading,
     className,
 }: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const selected = options.find((opt) => opt.value === value);

    /**
     * Preserve the scroll position when the popover opens/closes.
     *
     * When the popover opens, the search input inside it is auto-focused before
     * the popover has been positioned, so the browser scrolls the page (often all
     * the way to the top) trying to bring the not-yet-positioned element into view.
     * Restoring after the fact (e.g. via rAF) shows a visible jump-and-snap-back.
     *
     * Instead we pin the scroll position: any scroll fired during the short
     * open/close transition is immediately reverted, so the page never moves.
     */
    const handleOpenChange = React.useCallback((nextOpen: boolean) => {
        const x = window.scrollX;
        const y = window.scrollY;
        const pin = () => {
            if (window.scrollX !== x || window.scrollY !== y) {
                window.scrollTo(x, y);
            }
        };

        window.addEventListener('scroll', pin, true);
        window.setTimeout(() => {
            window.removeEventListener('scroll', pin, true);
        }, 300);

        setOpen(nextOpen);
    }, []);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled || isLoading}
                        className={cn(
                            'h-11 w-full justify-between font-normal',
                            !selected && 'text-muted-foreground',
                            'shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800',
                            className,
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            {selected?.leading}
                            <span className="truncate">
                                {selected
                                    ? selected.label
                                    : isLoading
                                        ? 'Loading...'
                                        : placeholder}
                            </span>
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                }
            />
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                side="bottom"
                align="start"
                sideOffset={4}
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={`${option.label} ${option.secondary ?? ''}`}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    {option.leading}
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate">{option.label}</span>
                                        {option.secondary && (
                                            <span className="truncate text-xs text-muted-foreground">
                                                {option.secondary}
                                            </span>
                                        )}
                                    </div>
                                    <Check
                                        className={cn(
                                            'ml-2 size-4 text-pink-500 dark:text-pink-300',
                                            value === option.value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}