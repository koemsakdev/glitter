'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DataTableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function DataTableSearch({
                                    value,
                                    onChange,
                                    placeholder = 'Search...',
                                    className = '',
                                }: DataTableSearchProps) {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 pl-9 shadow-none focus:shadow-none focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
            />
        </div>
    );
}