'use client';

import { useId, type CSSProperties } from 'react';

/**
 * Icons the shop can pick for its AI chat assistant (App settings →
 * Assistant). Each is a small animated character in the assistant colour.
 *
 * NOTE: copy of glitter-store/src/components/assistant/assistant-icons.tsx
 * (the storefront renders the real widget) —
 * keep the two in sync.
 */
export const ASSISTANT_ICON_IDS = [
    'buddy',
    'bot',
    'typing',
    'orbit',
    'headset',
] as const;
export type AssistantIconId = (typeof ASSISTANT_ICON_IDS)[number];

export function isAssistantIconId(v: unknown): v is AssistantIconId {
    return (
        typeof v === 'string' &&
        (ASSISTANT_ICON_IDS as readonly string[]).includes(v)
    );
}

// Animations live with the icons (not in globals.css) so they always ship
// with the component. Prefixed to avoid clashes; off for reduced motion.
const CSS = `
@keyframes gai-blink { 0%, 90%, 100% { transform: scaleY(1); } 94% { transform: scaleY(0.12); } }
@keyframes gai-glance { 0%, 30%, 100% { transform: translateX(0); } 40%, 52% { transform: translateX(-2px); } 62%, 74% { transform: translateX(2px); } }
@keyframes gai-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes gai-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .55; } 30% { transform: translateY(-3.5px); opacity: 1; } }
@keyframes gai-spin { to { transform: rotate(360deg); } }
@keyframes gai-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes gai-ripple { 0% { transform: scale(.85); opacity: .55; } 100% { transform: scale(1.25); opacity: 0; } }
.gai-on .gai-breathe { transform-box: view-box; transform-origin: 24px 24px; animation: gai-breathe 3.6s ease-in-out infinite; }
.gai-on .gai-blink { transform-box: fill-box; transform-origin: center; animation: gai-blink 4.2s ease-in-out infinite; }
.gai-on .gai-glance { animation: gai-glance 7s ease-in-out infinite; }
.gai-on .gai-dot { transform-box: fill-box; transform-origin: center; animation: gai-dot 1.3s ease-in-out infinite; }
.gai-on .gai-dot2 { animation-delay: .18s; }
.gai-on .gai-dot3 { animation-delay: .36s; }
.gai-on .gai-spin { transform-box: view-box; transform-origin: 24px 24px; animation: gai-spin 4.5s linear infinite; }
.gai-on .gai-pulse { animation: gai-pulse 1.6s ease-in-out infinite; }
.gai-on .gai-ripple { transform-box: view-box; transform-origin: 24px 24px; animation: gai-ripple 2.4s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gai-on * { animation: none !important; }
}
`;

/**
 * One assistant icon. `color` is any CSS colour (hex from settings); without
 * it the store's brand colour is used.
 */
export function AssistantIcon({
    icon = 'buddy',
    color,
    animated = true,
    shadow = false,
    className = '',
}: {
    icon?: AssistantIconId;
    color?: string | null;
    animated?: boolean;
    /** Soft shadow under the icon — for the floating button only. */
    shadow?: boolean;
    className?: string;
}) {
    // Unique gradient id per icon (several can be on screen at once).
    const gid = `gai-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const fill = `url(#${gid})`;
    const style = {
        '--ai': color?.trim() || 'var(--brand)',
    } as CSSProperties;

    return (
        <span
            style={style}
            className={`relative inline-flex items-center justify-center ${className}`}
        >
            <style>{CSS}</style>
            <svg
                viewBox="0 0 48 48"
                aria-hidden
                className={`size-full overflow-visible ${
                    shadow ? 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]' : ''
                } ${animated ? 'gai-on' : ''}`}
            >
                <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                        <stop
                            offset="0%"
                            style={{
                                stopColor:
                                    'color-mix(in oklab, var(--ai), white 22%)',
                            }}
                        />
                        <stop
                            offset="100%"
                            style={{
                                stopColor:
                                    'color-mix(in oklab, var(--ai), black 22%)',
                            }}
                        />
                    </linearGradient>
                </defs>
                <g className="gai-breathe">{GLYPHS[icon](fill)}</g>
            </svg>
        </span>
    );
}

const GLYPHS: Record<AssistantIconId, (fill: string) => React.ReactNode> = {
    /** Chat bubble with two friendly eyes that blink and glance around. */
    buddy: (fill) => (
        <>
            <path
                d="M24 4C35.6 4 44 11.9 44 22.5S35.6 41 24 41c-2.6 0-5-.4-7.3-1.1L9.4 43.6a1.6 1.6 0 0 1-2.3-1.7l1.3-6.6C5.6 32 4 27.5 4 22.5 4 11.9 12.4 4 24 4Z"
                fill={fill}
            />
            <path
                d="M13 12.5c3-3 6.9-4.5 11-4.5"
                stroke="white"
                strokeOpacity=".35"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
            />
            <g className="gai-glance" fill="white">
                <rect
                    className="gai-blink"
                    x="16.2"
                    y="17"
                    width="4.6"
                    height="9.5"
                    rx="2.3"
                />
                <rect
                    className="gai-blink"
                    x="27.2"
                    y="17"
                    width="4.6"
                    height="9.5"
                    rx="2.3"
                />
            </g>
        </>
    ),

    /** Modern robot head: antenna light, dark visor, glowing eyes. */
    bot: (fill) => (
        <>
            <line
                x1="24"
                y1="5"
                x2="24"
                y2="10"
                stroke={fill}
                strokeWidth="3"
                strokeLinecap="round"
            />
            <circle className="gai-pulse" cx="24" cy="4.5" r="3" fill={fill} />
            <rect x="6" y="10" width="36" height="30" rx="11" fill={fill} />
            <rect x="3" y="20" width="4" height="10" rx="2" fill={fill} />
            <rect x="41" y="20" width="4" height="10" rx="2" fill={fill} />
            <rect
                x="11"
                y="17"
                width="26"
                height="15"
                rx="7.5"
                fill="#0b1020"
                fillOpacity=".82"
            />
            <g className="gai-glance" fill="white">
                <rect
                    className="gai-blink"
                    x="16.5"
                    y="21"
                    width="4.5"
                    height="7"
                    rx="2.25"
                />
                <rect
                    className="gai-blink"
                    x="27"
                    y="21"
                    width="4.5"
                    height="7"
                    rx="2.25"
                />
            </g>
            <path
                d="M19 36.5h10"
                stroke="white"
                strokeOpacity=".55"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
        </>
    ),

    /** Chat bubble with a live "typing…" indicator. */
    typing: (fill) => (
        <>
            <path
                d="M10 7h28a7 7 0 0 1 7 7v15a7 7 0 0 1-7 7H22l-8.6 6.4A1.5 1.5 0 0 1 11 41.2V36h-1a7 7 0 0 1-7-7V14a7 7 0 0 1 7-7Z"
                fill={fill}
            />
            <g fill="white">
                <circle className="gai-dot" cx="15" cy="21.5" r="3" />
                <circle className="gai-dot gai-dot2" cx="24" cy="21.5" r="3" />
                <circle className="gai-dot gai-dot3" cx="33" cy="21.5" r="3" />
            </g>
        </>
    ),

    /** A glowing core with a satellite circling it — "thinking". */
    orbit: (fill) => (
        <>
            <circle cx="24" cy="24" r="20" fill={fill} />
            <circle
                cx="24"
                cy="24"
                r="13"
                fill="none"
                stroke="white"
                strokeOpacity=".35"
                strokeWidth="1.6"
                strokeDasharray="3 3.5"
            />
            <g className="gai-spin">
                <circle cx="24" cy="11" r="3.4" fill="white" />
            </g>
            <circle cx="24" cy="24" r="6.5" fill="white" />
            <circle cx="24" cy="24" r="3" fill={fill} />
        </>
    ),

    /** Friendly support agent: headset with a live ripple. */
    headset: (fill) => (
        <>
            <circle
                className="gai-ripple"
                cx="24"
                cy="24"
                r="20"
                fill={fill}
                opacity=".5"
            />
            <circle cx="24" cy="24" r="20" fill={fill} />
            <path
                d="M14 26v-3a10 10 0 0 1 20 0v3"
                fill="none"
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
            />
            <rect x="11.5" y="24" width="6" height="9" rx="3" fill="white" />
            <rect x="30.5" y="24" width="6" height="9" rx="3" fill="white" />
            <path
                d="M33.5 32.5c0 3-2.6 4.5-6.5 4.5"
                fill="none"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
            <circle
                className="gai-pulse"
                cx="25.5"
                cy="37"
                r="2.2"
                fill="white"
            />
        </>
    ),
};
