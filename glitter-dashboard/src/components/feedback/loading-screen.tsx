'use client';

import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
    variant?: 'page' | 'block' | 'inline';
    message?: string;
    className?: string;
}

export function LoadingScreen({
                                  variant = 'block',
                                  message,
                                  className = '',
                              }: LoadingScreenProps) {
    if (variant === 'page') {
        return (
            <div
                className={`flex min-h-screen items-center justify-center ${className}`}
            >
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-pink-500 dark:text-pink-300" />
                    {message && (
                        <p className="text-sm text-muted-foreground">{message}</p>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <span
                className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className}`}
            >
        <Loader2 className="size-4 animate-spin" />
                {message && <span>{message}</span>}
      </span>
        );
    }

    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
        >
            <Loader2 className="size-7 animate-spin text-pink-500 dark:text-pink-300" />
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
    );
}