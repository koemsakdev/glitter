'use client';

import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `<img>` that never shows the browser's broken-image icon or stray alt
 * text. If the source is missing or fails to load (404, blocked, offline) it
 * renders a soft stand-in in the same box instead:
 *   - round images (avatars, chips) → initials from `alt`
 *   - everything else → a gentle brand-tinted tile
 * Pass `fallback` to render something else.
 */
export function SafeImg({
    src,
    alt = '',
    fallback,
    onError,
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fallback?: ReactNode }) {
    const key = typeof src === 'string' ? src : '';
    // Remember WHICH src failed, so a new src gets a fresh attempt.
    const [failed, setFailed] = useState<string | null>(null);

    if (!src || failed === key) {
        if (fallback !== undefined) return <>{fallback}</>;
        const round = /\brounded-full\b/.test(className ?? '');
        const initials = alt
            .split(/\s+/)
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
        return (
            <span
                role={alt ? 'img' : undefined}
                aria-label={alt || undefined}
                aria-hidden={alt ? undefined : true}
                className={cn(
                    'flex select-none items-center justify-center overflow-hidden bg-linear-to-br from-(--brand)/10 via-zinc-100 to-(--brand)/5 dark:via-zinc-800',
                    className,
                )}
            >
                {round && initials ? (
                    <span className="text-[0.65rem] font-bold text-(--brand)">
                        {initials}
                    </span>
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-1/3 max-h-12 w-1/3 max-w-12 text-(--brand)/25"
                        fill="currentColor"
                        aria-hidden
                    >
                        {/* soft sparkle — decorative, matches the brand */}
                        <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
                        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
                    </svg>
                )}
            </span>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            {...props}
            src={src}
            alt={alt}
            className={className}
            onError={(e) => {
                setFailed(key);
                onError?.(e);
            }}
        />
    );
}
