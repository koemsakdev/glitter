'use client';

import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * `<img>` that never shows the browser's broken-image icon or stray alt
 * text. If the source is missing or fails to load (404, blocked, offline) it
 * renders a soft stand-in in the same box instead:
 *   - round images (avatars, chips) → initials from `alt`
 *   - everything else → a soft tinted box with an image icon sized to fit
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
                    'flex select-none items-center justify-center overflow-hidden bg-linear-to-br from-zinc-100 via-zinc-100 to-(--brand)/10 dark:from-zinc-800 dark:via-zinc-800 dark:to-(--brand)/15',
                    !round && '[container-type:size]',
                    // Width normally comes from the photo — keep the box square.
                    /\bw-auto\b/.test(className ?? '') && 'aspect-square',
                    className,
                )}
            >
                {round && initials ? (
                    <span className="text-[0.65rem] font-bold text-(--brand)">
                        {initials}
                    </span>
                ) : (
                    <ImageIcon
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="size-[38cqmin] max-h-12 min-h-3.5 max-w-12 min-w-3.5 text-zinc-400/70 dark:text-zinc-500"
                    />
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
