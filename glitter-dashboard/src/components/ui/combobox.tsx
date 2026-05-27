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
     * Preserve scroll position when popover opens/closes.
     * Base UI's Popover sometimes scrolls the trigger into view,
     * which is jarring when the trigger is already visible.
     */
    const handleOpenChange = React.useCallback((nextOpen: boolean) => {
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        setOpen(nextOpen);

        // Restore scroll on next 2 frames to outwait any browser auto-scroll
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (window.scrollY !== scrollY) {
                    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' as ScrollBehavior });
                }
            });
        });
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
                        <span className="truncate">
                          {selected ? selected.label : isLoading ? 'Loading...' : placeholder}
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
                                    <div className="flex flex-1 flex-col">
                                        <span>{option.label}</span>
                                        {option.secondary && (
                                            <span className="text-xs text-muted-foreground">
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