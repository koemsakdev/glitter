'use client';

import { ArrowUpRight, Clock, MessageCircle, Phone } from 'lucide-react';
import { MaintenanceCountdown } from '@/components/maintenance-countdown';
import { LanguageToggle } from '@/components/language-toggle';
import { useLang } from '@/lib/lang-context';
import { SafeImg } from '@/components/ui/safe-img';
import { fileUrl } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';

/**
 * "Under maintenance" — shown instead of the shop while maintenance mode is
 * on (App settings → Maintenance, admin only). Full-bleed brand colour with
 * an illustration on one side and the message on the other; stacks on
 * phones. Static on purpose — nothing that looks like a loading state.
 * It's a fixed layer, so the page behind never scrolls; the live connection
 * brings the shop back by itself when maintenance is switched off.
 */
export function MaintenanceScreen({
    config,
    lang: initialLang,
}: {
    config: StoreConfig;
    lang: Lang;
}) {
    // Follows the language switch instantly (client context).
    const { lang } = useLang(initialLang);
    const m = config.maintenance;
    const brand =
        pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const logo = fileUrl(config.logoUrl);
    const custom = pick(lang, m.messageEn, m.messageKm).trim();
    const backAt = m.endsAt
        ? new Date(m.endsAt).toLocaleString(lang === 'km' ? 'km-KH' : 'en-US', {
              timeZone: 'Asia/Phnom_Penh',
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
          })
        : null;

    // "Contact us": Telegram if set, else the shop phone.
    const phone = config.contacts.find(
        (c) => c.id === 'phone' && c.value?.trim(),
    )?.value;
    const contact = config.telegramUrl?.trim()
        ? { href: config.telegramUrl.trim(), icon: MessageCircle }
        : phone
          ? { href: `tel:${phone.replace(/\s+/g, '')}`, icon: Phone }
          : null;
    const social = config.socials.find((x) => x.url?.trim());

    return (
        <div className="fixed inset-0 z-[300] overflow-y-auto overscroll-contain bg-(--brand) text-white">
            {/* depth: soft lights + a faint dot grid */}
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(255,255,255,0.22),transparent_60%),radial-gradient(60%_60%_at_100%_100%,rgba(0,0,0,0.18),transparent_60%)]" />
            <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(80%_70%_at_50%_40%,#000,transparent)]" />

            <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-6 py-6 sm:px-10">
                {/* Top bar */}
                <header className="flex items-center gap-2.5">
                    {logo ? (
                        <SafeImg
                            src={logo}
                            alt={brand}
                            style={{ borderRadius: `${config.logoRadius}%` }}
                            className="size-9 bg-white object-contain p-0.5 shadow-sm"
                        />
                    ) : (
                        <span className="flex size-9 items-center justify-center rounded-lg bg-white font-bold text-(--brand)">
                            {brand.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <span className="font-semibold tracking-tight">
                        {brand}
                    </span>
                    <div className="ml-auto [&>div>button]:border-white/40 [&>div>button]:bg-white/10 [&>div>button]:backdrop-blur-sm">
                        <LanguageToggle lang={lang} />
                    </div>
                </header>

                <main className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
                    <div className="order-2 text-center md:order-1 md:text-left">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-sm">
                            <span className="size-2 rounded-full bg-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.3)]" />
                            {tr(lang, 'mtStatus')}
                        </span>

                        <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
                            {tr(lang, 'mtTitle')}
                        </h1>
                        <p className="mt-3 text-xl font-medium text-white/75 sm:text-2xl">
                            {tr(lang, 'mtLead')}
                        </p>

                        {custom && (
                            <p className="mx-auto mt-5 max-w-lg whitespace-pre-line text-base leading-relaxed text-white/90 md:mx-0">
                                {custom}
                            </p>
                        )}

                        <div className="mt-8 space-y-3">
                            {m.endsAt ? (
                                <>
                                    <MaintenanceCountdown
                                        endsAt={m.endsAt}
                                        lang={lang}
                                    />
                                    <p className="inline-flex items-center gap-1.5 text-sm text-white/80">
                                        <Clock className="size-4" />
                                        {tr(lang, 'mtBackAt')}: {backAt}
                                    </p>
                                </>
                            ) : (
                                <p className="text-base font-semibold">
                                    {tr(lang, 'mtBackShort')}
                                </p>
                            )}
                        </div>

                        {(contact || social) && (
                            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                                {contact && (
                                    <a
                                        href={contact.href}
                                        target={
                                            contact.href.startsWith('http')
                                                ? '_blank'
                                                : undefined
                                        }
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-(--brand) shadow-lg shadow-black/15 transition-transform hover:-translate-y-0.5"
                                    >
                                        <contact.icon className="size-4" />
                                        {tr(lang, 'mtCta')}
                                    </a>
                                )}
                                {social && (
                                    <a
                                        href={social.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ring-1 ring-white/40 transition-colors hover:bg-white/10"
                                    >
                                        {tr(lang, 'mtFollow')}
                                        <ArrowUpRight className="size-4" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Illustration on a frosted panel */}
                    <div className="order-1 md:order-2">
                        <div className="relative mx-auto max-w-[320px] rounded-[36px] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-md md:max-w-[460px] md:p-8">
                            <MaintenanceArt className="w-full" />
                        </div>
                    </div>
                </main>

                <footer className="pb-1 text-center text-xs text-white/60 md:text-left">
                    © {new Date().getFullYear()} {brand}
                </footer>
            </div>
        </div>
    );
}

// --- Illustration -----------------------------------------------------------

/** 8-tooth gear outline centred on (cx, cy) as an SVG path. */
function gearPath(cx: number, cy: number, r: number, depth: number): string {
    const teeth = 8;
    const pts: string[] = [];
    for (let i = 0; i < teeth * 4; i++) {
        const a = (i / (teeth * 4)) * Math.PI * 2 - Math.PI / 2;
        const onTooth = i % 4 === 1 || i % 4 === 2;
        const rr = onTooth ? r : r - depth;
        pts.push(
            `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`,
        );
    }
    return `M${pts.join('L')}Z`;
}

const GEAR_BACK = gearPath(210, 150, 92, 20);
const GEAR_FRONT = gearPath(200, 144, 92, 20);

/**
 * Flat-3D scene: a raised platform with a lawn, a big gear standing on it,
 * a wrench and an open toolbox. Platform tones follow the brand colour.
 */
function MaintenanceArt({ className }: { className?: string }) {
    const shade = (pct: number) =>
        `color-mix(in oklab, var(--brand), black ${pct}%)`;
    const tint = (pct: number) =>
        `color-mix(in oklab, var(--brand), white ${pct}%)`;
    return (
        <svg viewBox="0 0 400 380" className={className} aria-hidden>
            <style>{`
                @keyframes mt-gear-turn { to { transform: rotate(360deg); } }
                .mt-gear { transform-box: view-box; animation: mt-gear-turn 14s linear infinite; }
                @media (prefers-reduced-motion: reduce) { .mt-gear { animation: none; } }
            `}</style>
            {/* shadow under the platform */}
            <ellipse
                cx="200"
                cy="350"
                rx="170"
                ry="22"
                fill="rgba(0,0,0,0.12)"
            />

            {/* platform: sides then top */}
            <path
                d="M30 262 L200 346 L200 372 L30 288 Z"
                style={{ fill: shade(28) }}
            />
            <path
                d="M370 262 L200 346 L200 372 L370 288 Z"
                style={{ fill: shade(16) }}
            />
            <path
                d="M200 178 L370 262 L200 346 L30 262 Z"
                style={{ fill: tint(12) }}
            />

            {/* lawn */}
            <path d="M200 205 L318 262 L200 320 L82 262 Z" fill="#6bbf59" />
            <path d="M82 262 L200 320 L200 326 L82 268 Z" fill="#4f9a41" />
            <path d="M318 262 L200 320 L200 326 L318 268 Z" fill="#5aab4b" />

            {/* gear foot shadow on the lawn */}
            <ellipse
                cx="205"
                cy="246"
                rx="44"
                ry="10"
                fill="rgba(0,0,0,0.15)"
            />

            {/* gear: back face for depth, then the front with a hole —
                both turn slowly (like a calm "working on it") */}
            <g className="mt-gear" style={{ transformOrigin: '210px 150px' }}>
                <path d={GEAR_BACK} fill="#1d4ed8" />
            </g>
            <g className="mt-gear" style={{ transformOrigin: '200px 144px' }}>
                <path
                    d={`${GEAR_FRONT} M228 144 a28 28 0 1 0 -56 0 a28 28 0 1 0 56 0 Z`}
                    fill="#3b82f6"
                    fillRule="evenodd"
                />
                <circle
                    cx="200"
                    cy="144"
                    r="28"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="6"
                />
            </g>
            <path
                d="M140 96 A78 78 0 0 1 200 66"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="6"
                strokeLinecap="round"
            />

            {/* wrench lying on the lawn */}
            <g transform="translate(118 268) rotate(-28)">
                <rect
                    x="0"
                    y="-5"
                    width="62"
                    height="10"
                    rx="5"
                    fill="#cbd5e1"
                />
                <path
                    d="M58 -14 a14 14 0 1 1 0 28 l0 -9 l8 0 l0 -10 l-8 0 Z"
                    fill="#94a3b8"
                />
            </g>

            {/* open toolbox */}
            <g transform="translate(262 272)">
                <path d="M0 10 L44 32 L44 58 L0 36 Z" fill="#dc2626" />
                <path d="M44 32 L80 14 L80 40 L44 58 Z" fill="#ef4444" />
                <path d="M0 10 L36 -8 L80 14 L44 32 Z" fill="#b91c1c" />
                <path
                    d="M16 6 L36 -4 L62 9"
                    fill="none"
                    stroke="#7f1d1d"
                    strokeWidth="5"
                    strokeLinecap="round"
                />
                <rect
                    x="30"
                    y="2"
                    width="6"
                    height="16"
                    rx="2"
                    fill="#facc15"
                    transform="rotate(-25 33 10)"
                />
            </g>
        </svg>
    );
}
