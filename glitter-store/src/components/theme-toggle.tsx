'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Inline script (runs before paint) that applies the saved theme — no flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    function toggle() {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.classList.toggle('dark', next);
        try {
            localStorage.setItem('theme', next ? 'dark' : 'light');
        } catch {
            /* ignore */
        }
    }

    // Keep a fixed-size placeholder until mounted to avoid a hydration flash.
    if (!mounted) return <div className="h-6 w-11" />;

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggle}
            aria-label="Toggle dark mode"
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                isDark ? 'bg-slate-950' : 'bg-pink-500/50',
            )}
        >
            <span
                className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-pink-800',
                    isDark ? 'translate-x-5' : 'translate-x-0',
                )}
            >
                {isDark ? (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                    </svg>
                ) : (
                    <svg className="h-3 w-3 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                )}
            </span>
        </button>
    );
}
