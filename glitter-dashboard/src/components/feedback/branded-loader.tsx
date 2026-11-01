'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type LoaderSize = 'sm' | 'md';

interface BrandedLoaderProps {
    /** Optional label rendered under the loader */
    label?: string;
    /** Visual size — `sm` for inline/section, `md` for page/modal (default) */
    size?: LoaderSize;
    className?: string;
}

const SIZES: Record<
    LoaderSize,
    { box: string; logo: string; radius: string; gap: string; text: string }
> = {
    sm: {
        box: 'size-12',
        logo: 'size-6',
        radius: 'rounded-md',
        gap: 'gap-2.5',
        text: 'text-xs',
    },
    md: {
        box: 'size-16',
        logo: 'size-8',
        radius: 'rounded-lg',
        gap: 'gap-3',
        text: 'text-sm',
    },
};


const RING_MASK = {
    WebkitMask:
        'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
    mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
} as const;

/**
 * Branded loading indicator for the Glitter shop. The (small) logo bobs and tilts
 * in 3D with a shimmer sweep, framed by two counter-rotating pink gradient rings,
 * a pulsing glow and glitter dots that float up.
 */
export function BrandedLoader({
    label,
    size = 'md',
    className,
}: BrandedLoaderProps) {
    const s = SIZES[size];

    return (
        <div
            className={cn(
                'glitter-loader flex flex-col items-center',
                s.gap,
                className,
            )}
        >
            <div
                className={cn(
                    'relative flex items-center justify-center',
                    s.box,
                )}
                style={{ perspective: '500px' }}
            >
                {/* Pulsing glow */}
                <div className="absolute inset-1.5 rounded-full bg-pink-400/40 blur-lg animate-[glitter-glow_2.2s_ease-in-out_infinite]" />

                {/* Outer ring — clockwise */}
                <div
                    className="absolute inset-0 rounded-full animate-[spin_1.6s_linear_infinite]"
                    style={{
                        background:
                            'conic-gradient(from 90deg, transparent 0deg, #f9a8d4 110deg, #ec4899 240deg, transparent 330deg)',
                        ...RING_MASK,
                    }}
                />
                {/* Inner ring — counter-clockwise */}
                <div
                    className="absolute inset-1.25 rounded-full animate-[glitter-orbit-rev_2.4s_linear_infinite]"
                    style={{
                        background:
                            'conic-gradient(from 270deg, transparent 0deg, #f5d0fe 90deg, #e879f9 200deg, transparent 300deg)',
                        ...RING_MASK,
                    }}
                />

                {/* Logo: bob (outer) + 3D tilt (inner) + shimmer */}
                <div className="animate-[glitter-bob_2.4s_ease-in-out_infinite]">
                    <div
                        className={cn(
                            'relative overflow-hidden shadow-lg ring-2 ring-white/70 animate-[glitter-flip_3s_ease-in-out_infinite] dark:ring-white/20',
                            s.logo,
                            s.radius,
                        )}
                    >
                        <Image
                            src="/logo.png"
                            alt="Glitter"
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                            priority
                        />
                        <div
                            className="absolute inset-0 animate-[glitter-shimmer_2.4s_ease-in-out_infinite]"
                            style={{
                                background:
                                    'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)',
                            }}
                        />
                    </div>
                </div>

                {/* Glitter dust floating up */}
                <span
                    className="absolute bottom-1 left-[42%] size-1 rounded-full bg-pink-300 animate-[glitter-float_1.8s_ease-in_infinite]"
                    style={{ animationDelay: '0ms' }}
                />
                <span
                    className="absolute bottom-1.5 left-[56%] size-1 rounded-full bg-fuchsia-300 animate-[glitter-float_2.1s_ease-in_infinite]"
                    style={{ animationDelay: '500ms' }}
                />
                <span
                    className="absolute bottom-0 left-1/2 size-0.5 rounded-full bg-amber-200 animate-[glitter-float_1.6s_ease-in_infinite]"
                    style={{ animationDelay: '900ms' }}
                />
            </div>

            {label && (
                <p className={cn('font-medium text-foreground', s.text)}>
                    {label}
                </p>
            )}
        </div>
    );
}
