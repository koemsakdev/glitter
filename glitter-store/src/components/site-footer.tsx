import Link from 'next/link';
import { Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { SocialButtons } from '@/components/social-buttons';
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
            { href: '/promotion', label: 'navPromotion' },
            { href: '/brands', label: 'navBrand' },
            { href: '/products?sort=newest', label: 'footerNewArrivals' },
        ],
    },
    {
        heading: 'footerCompany',
        links: [
            { href: '/about', label: 'footerAbout' },
            { href: '/stores', label: 'navLocation' },
            { href: '/about', label: 'contact' },
        ],
    },
    {
        heading: 'footerAccount',
        links: [
            { href: '/account', label: 'footerMyAccount' },
            { href: '/account/orders', label: 'myOrders' },
            { href: '/account/wishlist', label: 'footerWishlist' },
            { href: '/checkout', label: 'cart' },
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
    lang,
}: {
    config: StoreConfig;
    lang: Lang;
    // menu kept for API compatibility; footer links are code-defined now.
    menu?: unknown;
}) {
    const shopName =
        pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const tagline = pick(lang, config.taglineEn, config.taglineKm);
    const description =
        pick(lang, config.footerDescriptionEn, config.footerDescriptionKm) ||
        tagline;

    const logo = fileUrl(config.logoUrl);
    const socials = config.socials.filter((s) => s.url?.trim());

    // "We accept" — derived from the delivery methods' payment rules: KHQR
    // (ABA PayWay) for prepay methods, cash for pay-on-receipt.
    const methods = config.delivery?.methods ?? [];
    const hasKhqr = methods.some(
        (m) => m.enabled && (m.payment === 'prepay' || m.payment === 'either'),
    );
    const hasCash = methods.some(
        (m) =>
            m.enabled && (m.payment === 'on_pickup' || m.payment === 'either'),
    );
    const acceptedPayments: { id: string; label: string; icon: string | null }[] =
        [];
    if (hasKhqr) acceptedPayments.push({ id: 'khqr', label: 'KHQR', icon: null });
    if (hasCash)
        acceptedPayments.push({
            id: 'cash',
            label: pick(lang, 'Cash', 'សាច់ប្រាក់'),
            icon: null,
        });

    // Prefer the structured contacts; fall back to the flat fields.
    const structured = config.contacts.filter((c) => c.value?.trim());
    const fallback: { id: string; value: string }[] = [];
    if (structured.length === 0) {
        if (config.contactPhone)
            fallback.push({ id: 'phone', value: config.contactPhone });
        if (config.contactEmail)
            fallback.push({ id: 'email', value: config.contactEmail });
        const addr = pick(lang, config.contactAddressEn, config.contactAddressKm);
        if (addr) fallback.push({ id: 'address', value: addr });
    }
    const contacts: { id: string; value: string }[] =
        structured.length > 0
            ? structured.map((c) => ({ id: c.id, value: c.value }))
            : fallback;

    return (
        <footer className="mt-16 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">

            {/* Main */}
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
                {/* Brand + contact */}
                <div className="lg:col-span-2">
                    <Link href="/" className="flex items-center gap-2.5">
                        {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logo}
                                alt={shopName}
                                className="size-10 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                            />
                        ) : (
                            <span className="flex size-10 items-center justify-center rounded-xl bg-(--brand) text-sm font-bold text-white">
                                {shopName.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {shopName}
                        </span>
                    </Link>

                    {description && (
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {description}
                        </p>
                    )}

                    {contacts.length > 0 && (
                        <ul className="mt-5 space-y-2.5 text-sm">
                            {contacts.map((c) => {
                                const Icon = contactIcon(c.id);
                                const href = contactHref(c.id, c.value);
                                const body = (
                                    <span className="flex items-start gap-2.5 text-zinc-600 transition-colors group-hover:text-(--brand) dark:text-zinc-300">
                                        <Icon className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                        {c.value}
                                    </span>
                                );
                                return (
                                    <li key={`${c.id}-${c.value}`}>
                                        {href ? (
                                            <a href={href} className="group">
                                                {body}
                                            </a>
                                        ) : (
                                            <span className="group">{body}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <SocialButtons socials={socials} className="mt-5" />
                </div>

                {/* Link columns */}
                {LINK_COLUMNS.map((col) => (
                    <div key={col.heading}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {tr(lang, col.heading)}
                        </h3>
                        <nav className="mt-3 flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                            {col.links.map((l) => (
                                <Link
                                    key={`${col.heading}-${l.href}-${l.label}`}
                                    href={l.href}
                                    className="w-fit transition-colors hover:text-(--brand)"
                                >
                                    {tr(lang, l.label)}
                                </Link>
                            ))}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-zinc-200 dark:border-zinc-800">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-zinc-400 sm:flex-row">
                    <p>
                        © {new Date().getFullYear()} {shopName}.{' '}
                        {tr(lang, 'footerRights')}
                    </p>
                    {acceptedPayments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="hidden text-zinc-400 sm:inline">
                                {tr(lang, 'footerPayments')}
                            </span>
                            {acceptedPayments.map((p) =>
                                p.icon ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={p.id}
                                        src={p.icon}
                                        alt={p.label}
                                        title={p.label}
                                        className="h-6 w-auto rounded-md border border-zinc-200 bg-white object-contain px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                ) : (
                                    <span
                                        key={p.id}
                                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                                    >
                                        {p.label}
                                    </span>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </footer>
    );
}
