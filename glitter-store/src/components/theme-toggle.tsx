'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    function toggleTheme() {
        applyThemeChange(!isDark);
    }

    function applyThemeChange(toDark: boolean) {
        setIsDark(toDark);
        document.documentElement.classList.toggle('dark', toDark);
        try {
            localStorage.setItem('theme', toDark ? 'dark' : 'light');
        } catch {
            /* ignore */
        }
    }

    // Fixed-size placeholder until mounted to cleanly avoid a hydration flash
    if (!mounted) {
        return <div className="h-9 w-9 rounded-full" />;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-neutral-200 dark:border-neutral-800"
            onClick={toggleTheme}
            aria-label="Toggle theme"
        >
            <Sun
                className={cn(
                    "h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0",
                    isDark && "-rotate-90 scale-0"
                )}
            />
            <Moon
                className={cn(
                    "absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100",
                    isDark && "rotate-0 scale-100"
                )}
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}