'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLang } from '@/lib/lang-context';
import { tr } from '@/lib/locale';

export function ProductSearch() {
    const { lang } = useLang();
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
        <div className="group relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-(--brand)">
                <Search className="size-4.5" />
            </span>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={tr(lang, 'search')}
                className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-12 pr-11 text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-(--brand) focus:shadow-md focus:ring-4 focus:ring-(--brand)/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {value && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}
