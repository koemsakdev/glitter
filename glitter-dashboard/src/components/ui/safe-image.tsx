'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SafeImageProps = Omit<ImageProps, 'src'> & {
    src: ImageProps['src'] | null | undefined;
    /** Shown instead when there's no src or it fails to load. */
    fallback?: ReactNode;
};

/**
 * `next/image` that never shows a broken-image icon or stray alt text.
 * When the source is missing or fails to load (404, blocked, offline), it
 * renders a stand-in picture in the same box instead:
 *   - round images (avatars) → the person's initials, from `alt`
 *   - everything else → the shop logo, softly faded
 * Pass `fallback` to use something else.
 */
export function SafeImage({
    src,
    alt,
    fallback,
    onError,
    className,
    ...props
}: SafeImageProps) {
    const key = typeof src === 'string' ? src : src ? 'static' : '';
    // Remember WHICH src failed, so a new src gets a fresh attempt.
    const [failed, setFailed] = useState<string | null>(null);

    if (!src || failed === key) {
        if (fallback !== undefined) return <>{fallback}</>;
        return (
            <ImageStandIn
                alt={alt}
                className={className}
                fill={Boolean(props.fill)}
                width={typeof props.width === 'number' ? props.width : undefined}
                height={
                    typeof props.height === 'number' ? props.height : undefined
                }
            />
        );
    }

    return (
        <Image
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

/**
 * Plain `<img>` with the same behaviour as SafeImage — for previews, blob
 * URLs and places where next/image doesn't fit.
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
    const [failed, setFailed] = useState<string | null>(null);

    if (!src || failed === key) {
        if (fallback !== undefined) return <>{fallback}</>;
        return <ImageStandIn alt={alt} className={className} fill={false} />;
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

function ImageStandIn({
    alt,
    className,
    fill,
    width,
    height,
}: {
    alt: string;
    className?: string;
    fill: boolean;
    width?: number;
    height?: number;
}) {
    const round = /\brounded-full\b/.test(className ?? '');
    const box = cn(
        'flex select-none items-center justify-center overflow-hidden bg-muted',
        fill && 'absolute inset-0 size-full',
        className,
    );
    const style = fill ? undefined : { width, height };

    if (round) {
        const initials =
            alt
                .split(/\s+/)
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || '?';
        return (
            <span
                role="img"
                aria-label={alt}
                style={style}
                className={cn(
                    box,
                    'bg-pink-100 text-[0.7em] font-semibold text-pink-600 dark:bg-pink-500/20 dark:text-pink-300',
                )}
            >
                <span className="text-xs leading-none">{initials}</span>
            </span>
        );
    }

    return (
        <span role="img" aria-label={alt} style={style} className={box}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logo.png"
                alt=""
                className="h-1/2 max-h-16 w-1/2 max-w-16 object-contain opacity-30 grayscale"
            />
        </span>
    );
}
