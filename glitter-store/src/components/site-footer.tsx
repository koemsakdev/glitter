'use client';

import Link from 'next/link';
import {
    ArrowUp,
    Banknote,
    ChevronDown,
    Mail,
    MapPin,
    Phone,
    Store,
    type LucideIcon,
} from 'lucide-react';
import { SafeImg } from '@/components/ui/safe-img';
import { SocialButtons } from '@/components/social-buttons';
import { fileUrl } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';

/** Footer link columns — defined in code so they always point at real pages. */
const LINK_COLUMNS: {
    heading: string;
    links: { href: string; label: string }[];
}[] = [
    {
        heading: 'footerShop',
        links: [
            { href: '/products', label: 'allProducts' },
            { href: '/products?sort=newest', label: 'footerNewArrivals' },
            { href: '/promotion', label: 'navPromotion' },
            { href: '/brands', label: 'navBrand' },
        ],
    },
    {
        heading: 'footerCompany',
        links: [
            { href: '/about', label: 'footerAbout' },
            { href: '/stores', label: 'navLocation' },
        ],
    },
    {
        heading: 'footerAccount',
        links: [
            { href: '/account', label: 'footerMyAccount' },
            { href: '/account/orders', label: 'myOrders' },
            { href: '/account/wishlist', label: 'footerWishlist' },
            { href: '/cart', label: 'cart' },
        ],
    },
];

function contactIcon(id: string): LucideIcon {
    if (id === 'phone') return Phone;
    if (id === 'email') return Mail;
    return MapPin;
}

function contactHref(id: string, value: string): string | undefined {
    if (id === 'phone') return `tel:${value.replace(/\s+/g, '')}`;
    if (id === 'email') return `mailto:${value}`;
    return undefined;
}

export function SiteFooter({
    config,
    lang: initialLang,
}: {
    config: StoreConfig;
    lang: Lang;
    // menu kept for API compatibility; footer links are code-defined now.
    menu?: unknown;
}) {
    const { lang } = useLang(initialLang);
    const shopName =
        pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const tagline = pick(lang, config.taglineEn, config.taglineKm);
    const description =
        pick(lang, config.footerDescriptionEn, config.footerDescriptionKm) ||
        tagline;

    const logo = fileUrl(config.logoUrl);
    const socials = config.socials.filter((s) => s.url?.trim());

    // "We accept" — from the delivery methods' payment rules: KHQR (ABA
    // PayWay) for prepay methods, cash for pay-on-receipt.
    const methods = config.delivery?.methods ?? [];
    const hasKhqr = methods.some(
        (m) => m.enabled && (m.payment === 'prepay' || m.payment === 'either'),
    );
    const hasCash = methods.some(
        (m) =>
            m.enabled && (m.payment === 'on_pickup' || m.payment === 'either'),
    );

    // Prefer the structured contacts; fall back to the flat fields.
    const structured = config.contacts.filter((c) => c.value?.trim());
    const fallback: { id: string; value: string }[] = [];
    if (structured.length === 0) {
        if (config.contactPhone)
            fallback.push({ id: 'phone', value: config.contactPhone });
        if (config.contactEmail)
            fallback.push({ id: 'email', value: config.contactEmail });
        const addr = pick(
            lang,
            config.contactAddressEn,
            config.contactAddressKm,
        );
        if (addr) fallback.push({ id: 'address', value: addr });
    }
    const contacts: { id: string; value: string }[] =
        structured.length > 0
            ? structured.map((c) => ({ id: c.id, value: c.value }))
            : fallback;

    const year = new Date().getFullYear();

    return (
        <footer className="mt-20 border-t border-zinc-200/80 bg-linear-to-b from-zinc-50 to-white pb-24 md:pb-0 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-950">
            <div className="mx-auto max-w-6xl px-4">
                {/* ── Main ── */}
                <div className="grid gap-10 py-12 md:grid-cols-12 md:gap-8 md:py-14">
                    {/* Brand */}
                    <div className="md:col-span-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-3"
                        >
                            {logo ? (
                                <SafeImg
                                    src={logo}
                                    alt={shopName}
                                    style={{
                                        borderRadius: `${config.logoRadius}%`,
                                    }}
                                    className="size-11 object-contain"
                                />
                            ) : (
                                <span className="flex size-11 items-center justify-center rounded-2xl bg-(--brand) text-base font-bold text-white">
                                    {shopName.charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                {shopName}
                            </span>
                        </Link>

                        {description && (
                            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {description}
                            </p>
                        )}

                        {socials.length > 0 && (
                            <SocialButtons socials={socials} className="mt-6" />
                        )}
                    </div>

                    {/* Link columns — open lists on desktop, tap-to-open on phones */}
                    <div className="grid gap-x-8 md:col-span-5 md:grid-cols-3">
                        {LINK_COLUMNS.map((col) => (
                            <details
                                key={col.heading}
                                className="group border-b border-zinc-200/80 md:border-0 dark:border-zinc-800 [&_summary::-webkit-details-marker]:hidden"
                                open
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 md:pointer-events-none md:cursor-default md:py-0">
                                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-900 dark:text-zinc-100">
                                        {tr(lang, col.heading)}
                                    </h3>
                                    <ChevronDown className="size-4 text-zinc-400 transition-transform group-open:rotate-180 md:hidden" />
                                </summary>
                                <nav className="flex flex-col gap-3 pb-4 text-sm md:mt-4 md:pb-0">
                                    {col.links.map((l) => (
                                        <Link
                                            key={`${col.heading}-${l.href}`}
                                            href={l.href}
                                            className="w-fit text-zinc-500 transition-colors hover:text-(--brand) dark:text-zinc-400"
                                        >
                                            {tr(lang, l.label)}
                                        </Link>
                                    ))}
                                </nav>
                            </details>
                        ))}
                    </div>

                    {/* Contact */}
                    {contacts.length > 0 && (
                        <div className="md:col-span-3">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-900 dark:text-zinc-100">
                                {tr(lang, 'footerContact')}
                            </h3>
                            <ul className="mt-4 space-y-3 text-sm">
                                {contacts.map((c) => {
                                    const Icon = contactIcon(c.id);
                                    const href = contactHref(c.id, c.value);
                                    const body = (
                                        <>
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand) transition-colors group-hover:bg-(--brand) group-hover:text-white">
                                                <Icon className="size-3.5" />
                                            </span>
                                            <span className="min-w-0 break-words pt-1.5 text-zinc-600 transition-colors group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white">
                                                {c.value}
                                            </span>
                                        </>
                                    );
                                    return (
                                        <li key={`${c.id}-${c.value}`}>
                                            {href ? (
                                                <a
                                                    href={href}
                                                    className="group flex items-start gap-3"
                                                >
                                                    {body}
                                                </a>
                                            ) : (
                                                <span className="group flex items-start gap-3">
                                                    {body}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            <Link
                                href="/stores"
                                className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                            >
                                <Store className="size-4" />
                                {tr(lang, 'footerFindStore')}
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Bottom bar ── */}
                <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-zinc-200/80 py-6 text-xs text-zinc-500 sm:flex-row dark:border-zinc-800 dark:text-zinc-400">
                    <p className="text-center sm:text-left">
                        © {year} {shopName}. {tr(lang, 'footerRights')}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {(hasKhqr || hasCash) && (
                            <>
                                <span className="mr-1 text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'footerPayments')}
                                </span>
                                {hasKhqr && (
                                    // The KHQR mark is a full red card — show it
                                    // as one, clipped to the badge shape.
                                    <SafeImg
                                        src="/khqr.png"
                                        alt="KHQR"
                                        title="KHQR"
                                        className="h-8 w-24 rounded-md object-cover shadow-sm ring-1 ring-black/5"
                                    />
                                )}
                                {hasCash && (
                                    <span className="flex h-8 w-24 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                        <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        {pick(lang, 'Cash', 'សាច់ប្រាក់')}
                                    </span>
                                )}
                            </>
                        )}
                        <span
                            aria-hidden="true"
                            className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-700"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                            aria-label={tr(lang, 'footerBackToTop')}
                            title={tr(lang, 'footerBackToTop')}
                            className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:border-(--brand) hover:bg-(--brand) hover:text-white dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <ArrowUp className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
