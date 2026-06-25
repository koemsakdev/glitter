'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ code: Lang; native: string; sub: string }> = [
    { code: 'en', native: 'English', sub: 'English' },
    { code: 'km', native: 'ខ្មែរ', sub: 'Khmer' },
];

export function LanguageToggle({ lang }: { lang: Lang }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    function setLang(next: Lang) {
        setOpen(false);
        if (next === lang) return;
        document.cookie = `lang=${next};path=/;max-age=31536000`;
        // Keep the page visible while it updates (no full reload).
        startTransition(() => router.refresh());
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Language"
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    'relative flex size-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-300',
                    isPending && 'opacity-60',
                )}
            >
                <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                </svg>
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-pink-400 px-1 text-[8px] font-bold leading-tight text-white dark:bg-pink-300 dark:text-pink-950">
                    {lang === 'en' ? 'EN' : 'KH'}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.code}
                            type="button"
                            onClick={() => setLang(opt.code)}
                            className={cn(
                                'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-pink-50 dark:hover:bg-pink-500/10',
                                lang === opt.code && 'font-semibold',
                            )}
                        >
                            <span className="flex flex-col">
                                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                    {opt.native}
                                </span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {opt.sub}
                                </span>
                            </span>
                            {lang === opt.code && (
                                <svg
                                    className="size-4 text-pink-500"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
