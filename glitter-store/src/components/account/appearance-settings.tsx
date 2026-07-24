/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import Flag from 'react-world-flags';
import { Globe, Moon, Sun } from 'lucide-react';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

const LANGS: { code: Lang; country: string; native: string }[] = [
    { code: 'en', country: 'US', native: 'English' },
    { code: 'km', country: 'KH', native: 'ខ្មែរ' },
];

const segBtn =
    'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97]';
const segActive =
    'bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-zinc-950 dark:text-white dark:ring-white/10';
const segIdle =
    'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200';

/** Language + theme controls, surfaced in the profile page (the store's config
 *  lives here now that the web header is desktop-only). */
export function AppearanceSettings({ lang: initialLang }: { lang: Lang }) {
    const { lang, setLang } = useLang(initialLang);

    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    function applyTheme(dark: boolean) {
        setIsDark(dark);
        document.documentElement.classList.toggle('dark', dark);
        try {
            localStorage.setItem('theme', dark ? 'dark' : 'light');
        } catch {
            /* ignore */
        }
    }

    return (
        <>
            <h2 className="mb-2 mt-6 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'preferences')}
            </h2>
            <div className="space-y-5 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {/* Language */}
                <div>
                    <div className="mb-2 flex items-center gap-2 px-0.5">
                        <Globe className="size-4 text-(--brand)" />
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {tr(lang, 'language')}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
                        {LANGS.map((o) => (
                            <button
                                key={o.code}
                                type="button"
                                onClick={() => setLang(o.code)}
                                aria-pressed={lang === o.code}
                                className={cn(
                                    segBtn,
                                    lang === o.code ? segActive : segIdle,
                                )}
                            >
                                <span className="size-5 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15">
                                    <Flag
                                        code={o.country}
                                        className="size-full object-cover"
                                    />
                                </span>
                                {o.native}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Appearance / theme */}
                <div>
                    <div className="mb-2 flex items-center gap-2 px-0.5">
                        <Moon className="size-4 text-(--brand)" />
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {tr(lang, 'appearance')}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
                        <button
                            type="button"
                            onClick={() => applyTheme(false)}
                            disabled={!mounted}
                            aria-pressed={mounted && !isDark}
                            className={cn(
                                segBtn,
                                mounted && !isDark ? segActive : segIdle,
                            )}
                        >
                            <Sun className="size-4" />
                            {tr(lang, 'light')}
                        </button>
                        <button
                            type="button"
                            onClick={() => applyTheme(true)}
                            disabled={!mounted}
                            aria-pressed={mounted && isDark}
                            className={cn(
                                segBtn,
                                mounted && isDark ? segActive : segIdle,
                            )}
                        >
                            <Moon className="size-4" />
                            {tr(lang, 'dark')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
