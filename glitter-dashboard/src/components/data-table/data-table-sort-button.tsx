'use client';

import { ArrowDownUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SortOption } from './types';

interface DataTableSortButtonProps<TValue extends string> {
    options: SortOption<TValue>[];
    value: TValue;
    onChange: (option: SortOption<TValue>) => void;
    label?: string;
}

export function DataTableSortButton<TValue extends string>({
                                                               options,
                                                               value,
                                                               onChange,
                                                               label = 'Sort',
                                                           }: DataTableSortButtonProps<TValue>) {
    const currentOption = options.find((o) => o.value === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="outline" className="gap-2">
                        <ArrowDownUp className="size-4" />
                        <span className="hidden sm:inline">
              {currentOption?.label ?? label}
            </span>
                        <span className="sm:hidden">{label}</span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-56">
                {options.map((option) => {
                    const isActive = option.value === value;
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => onChange(option)}
                            className={isActive ? 'font-semibold' : ''}
                        >
                            <span>{option.label}</span>
                            {isActive && (
                                <Check className="ml-auto size-4 text-pink-500 dark:text-pink-300" />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}