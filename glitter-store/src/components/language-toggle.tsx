'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Flag from 'react-world-flags';
import type { Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{ code: Lang; country: string; native: string; sub: string }> =
    [
        { code: 'en', country: 'US', native: 'English', sub: 'English' },
        { code: 'km', country: 'KH', native: 'ខ្មែរ', sub: 'Khmer' },
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
        startTransition(() => router.refresh());
    }

    const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Language"
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    'relative flex size-9 items-center justify-center rounded-full border border-zinc-200 transition-colors hover:border-(--brand) dark:border-zinc-700',
                    isPending && 'opacity-60',
                )}
            >
                <span className="size-6 overflow-hidden rounded-full">
                    <Flag
                        code={current.country}
                        className="size-full object-cover"
                    />
                </span>
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
                            <span className="flex items-center gap-3">
                                <span className="size-8 shrink-0 overflow-hidden rounded-full border border-zinc-100 dark:border-zinc-800">
                                    <Flag
                                        code={opt.country}
                                        className="size-full object-cover"
                                    />
                                </span>
                                <span className="flex flex-col">
                                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                                        {opt.native}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                        {opt.sub}
                                    </span>
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
