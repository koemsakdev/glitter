'use client';

import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { useStoreLogo } from '@/lib/store-logo';
import { cn } from '@/lib/utils';

/**
 * `<img>` that never shows the browser's broken-image icon or stray alt
 * text. If the source is missing or fails to load (404, blocked, offline) it
 * renders a soft stand-in in the same box instead:
 *   - round images (avatars, chips) → initials from `alt`
 *   - everything else → the store's logo, softly faded, on a brand tint
 *     (if the logo can't load either: just the soft tint, no icon)
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
    const logo = useStoreLogo();
    // If the logo itself fails too, show just the soft tint.
    const [logoFailed, setLogoFailed] = useState(false);
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
                ) : logo && !logoFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logo}
                        alt=""
                        onError={() => setLogoFailed(true)}
                        className="h-2/5 max-h-20 w-2/5 max-w-20 object-contain opacity-40 grayscale-[30%]"
                    />
                ) : null}
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
