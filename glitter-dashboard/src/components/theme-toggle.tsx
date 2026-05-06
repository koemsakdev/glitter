'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { flushSync } from 'react-dom';

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark';

    async function toggleTheme() {
        const nextTheme = isDark ? 'light' : 'dark';

        if (
            !buttonRef.current ||
            !('startViewTransition' in document) ||
            typeof document.startViewTransition !== 'function'
        ) {
            setTheme(nextTheme);
            return;
        }

        const rect = buttonRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        const transition = document.startViewTransition(() => {
            flushSync(() => {
                setTheme(nextTheme);
            });
        });

        transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`,
                    ],
                },
                {
                    duration: 500,
                    easing: 'ease-in-out',
                    pseudoElement: '::view-transition-new(root)',
                },
            );
        });
    }

    return (
        <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={toggleTheme}
            aria-label="Toggle theme"
        >
            <Sun
                className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
                suppressHydrationWarning
            />
            <Moon
                className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
                suppressHydrationWarning
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}