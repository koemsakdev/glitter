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

/** A small 4-point glitter sparkle. */
function Sparkle({
    className,
    style,
}: {
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
            <path
                d="M12 0c.7 5.7 2.6 7.6 8.3 8.3-5.7.7-7.6 2.6-8.3 8.3-.7-5.7-2.6-7.6-8.3-8.3C9.4 7.6 11.3 5.7 12 0z"
                fill="currentColor"
            />
        </svg>
    );
}

const RING_MASK = {
    WebkitMask:
        'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
    mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
} as const;

/**
 * Branded loading indicator for the Glitter shop. The (small) logo bobs and tilts
 * in 3D with a shimmer sweep, framed by two counter-rotating pink gradient rings,
 * a pulsing glow, sparkles that orbit and twinkle, and glitter that floats up.
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
                className={cn('relative flex items-center justify-center', s.box)}
                style={{ perspective: '500px' }}
            >
                {/* Orbiting sparkles — two layers spinning at different speeds/directions */}
                <div className="absolute inset-0 animate-[spin_3.5s_linear_infinite]">
                    <Sparkle className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 text-pink-400" />
                </div>
                <div className="absolute inset-0 animate-[glitter-orbit-rev_5s_linear_infinite]">
                    <Sparkle className="absolute right-0 top-1/2 size-2 -translate-y-1/2 text-fuchsia-400" />
                    <Sparkle className="absolute bottom-0 left-0 size-1.5 text-amber-300" />
                </div>

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

                {/* Twinkling sparkles (fixed positions) */}
                <Sparkle
                    className="absolute -top-0.5 right-1.5 size-2.5 text-pink-300 animate-[glitter-twinkle_1.6s_ease-in-out_infinite]"
                    style={{ animationDelay: '200ms' }}
                />
                <Sparkle
                    className="absolute -bottom-0.5 left-2 size-2 text-fuchsia-300 animate-[glitter-twinkle_1.9s_ease-in-out_infinite]"
                    style={{ animationDelay: '650ms' }}
                />

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
                <p className={cn('font-medium text-foreground', s.text)}>{label}</p>
            )}
        </div>
    );
}
