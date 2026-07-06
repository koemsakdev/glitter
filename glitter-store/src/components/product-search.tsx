'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ProductSearch({ placeholder }: { placeholder: string }) {
    const router = useRouter();
    const params = useSearchParams();
    const searchParam = params.get('search') ?? '';
    const [value, setValue] = useState(searchParam);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Keep the box in sync when the URL changes externally (e.g. "Clear
    // filters", category chips, or back/forward navigation).
    useEffect(() => {
        setValue(searchParam);
    }, [searchParam]);

    function navigate(next: string) {
        const p = new URLSearchParams(params.toString());
        const trimmed = next.trim();
        if (trimmed) p.set('search', trimmed);
        else p.delete('search');
        p.delete('page');
        router.replace(`/products?${p.toString()}`, { scroll: false });
    }

    function onChange(v: string) {
        setValue(v);
        clearTimeout(timer.current);
        // Live search — navigates a short moment after the user stops typing.
        timer.current = setTimeout(() => navigate(v), 350);
    }

    function clear() {
        clearTimeout(timer.current);
        setValue('');
        navigate('');
    }

    return (
        <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-11 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {value && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}
