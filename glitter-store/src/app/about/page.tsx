import Link from 'next/link';
import {
    ArrowRight,
    Gem,
    Gift,
    Headphones,
    Heart,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Sparkles,
    Star,
    Truck,
    type LucideIcon,
} from 'lucide-react';
import { SocialButtons } from '@/components/social-buttons';
import { fileUrl, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { pick, tr } from '@/lib/locale';

export const metadata = { title: 'About us' };

export const dynamic = 'force-dynamic';

const HL_ICONS: Record<string, LucideIcon> = {
    sparkles: Sparkles,
    truck: Truck,
    shield: ShieldCheck,
    heart: Heart,
    star: Star,
    gem: Gem,
    gift: Gift,
    headphones: Headphones,
};

function contactIcon(id: string) {
    if (id === 'phone') return Phone;
    if (id === 'email') return Mail;
    return MapPin;
}

export default async function AboutPage() {
    const [lang, config] = await Promise.all([getLang(), getStoreConfig()]);

    const brandName =
        pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const tagline = pick(lang, config.taglineEn, config.taglineKm);
    const headline =
        pick(lang, config.aboutHeadlineEn, config.aboutHeadlineKm) ||
        tr(lang, 'aboutTitle');
    const story = pick(lang, config.aboutStoryEn, config.aboutStoryKm);
    const logo = fileUrl(config.logoUrl);
    const heroImg = fileUrl(config.aboutImageUrl);
    const stats = config.aboutStats ?? [];
    const highlights = config.aboutHighlights ?? [];
    const contacts = config.contacts ?? [];
    const socials = config.socials ?? [];
    const address = pick(lang, config.contactAddressEn, config.contactAddressKm);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
            {/* Hero */}
            {heroImg ? (
                <section className="relative overflow-hidden rounded-3xl shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={heroImg}
                        alt={brandName}
                        className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-transparent" />
                    <div className="relative flex min-h-64 flex-col items-center justify-end p-8 text-center text-white sm:min-h-80">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            {brandName}
                        </h1>
                        {tagline && (
                            <p className="mt-2 max-w-lg text-white/85">
                                {tagline}
                            </p>
                        )}
                    </div>
                </section>
            ) : (
                <section className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-linear-to-br from-(--brand)/12 via-white to-white px-6 py-12 text-center shadow-sm sm:px-10 sm:py-16 dark:border-zinc-800 dark:from-(--brand)/15 dark:via-zinc-950 dark:to-zinc-950">
                    <span className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-(--brand)/15 blur-3xl" />
                    <div className="relative flex flex-col items-center">
                        {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logo}
                                alt={brandName}
                                className="size-24 rounded-3xl object-cover shadow-md ring-1 ring-zinc-200 dark:ring-zinc-700"
                            />
                        ) : (
                            <span className="flex size-24 items-center justify-center rounded-3xl bg-(--brand) text-4xl font-bold text-white shadow-md">
                                {brandName.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
                            {brandName}
                        </h1>
                        {tagline && (
                            <p className="mt-3 max-w-lg text-zinc-600 dark:text-zinc-300">
                                {tagline}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* Stats */}
            {stats.length > 0 && (
                <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {stats.map((s) => (
                        <div
                            key={s.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <p className="text-2xl font-extrabold text-(--brand) sm:text-3xl">
                                {s.value}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {pick(lang, s.labelEn, s.labelKm)}
                            </p>
                        </div>
                    ))}
                </section>
            )}

            {/* Story */}
            {story && (
                <section className="mx-auto mt-14 max-w-2xl text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-semibold text-(--brand)">
                        <Sparkles className="size-3.5" />
                        {tr(lang, 'aboutTitle')}
                    </span>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {headline}
                    </h2>
                    <p className="mt-4 whitespace-pre-line text-left leading-relaxed text-zinc-600 sm:text-center dark:text-zinc-300">
                        {story}
                    </p>
                </section>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
                <section className="mt-14">
                    <h2 className="text-center text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {tr(lang, 'aboutWhy')}
                    </h2>
                    <div className="mt-6 grid gap-5 sm:grid-cols-3">
                        {highlights.map((h) => {
                            const Icon = HL_ICONS[h.icon] ?? Sparkles;
                            return (
                                <div
                                    key={h.id}
                                    className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-(--brand)/10 text-(--brand)">
                                        <Icon className="size-6" />
                                    </span>
                                    <h3 className="mt-4 font-bold text-zinc-900 dark:text-zinc-50">
                                        {pick(lang, h.titleEn, h.titleKm)}
                                    </h3>
                                    {pick(lang, h.textEn, h.textKm) && (
                                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                            {pick(lang, h.textEn, h.textKm)}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Contact + Socials */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {tr(lang, 'aboutContactTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'aboutContactSub')}
                    </p>
                    <ul className="mt-4 space-y-3 text-sm">
                        {contacts.length > 0 ? (
                            contacts.map((c) => {
                                const Icon = contactIcon(c.id);
                                return (
                                    <li
                                        key={c.id}
                                        className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300"
                                    >
                                        <Icon className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                        <span>
                                            {c.label && (
                                                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
                                                    {c.label}
                                                </span>
                                            )}
                                            {c.value}
                                        </span>
                                    </li>
                                );
                            })
                        ) : (
                            <>
                                {config.contactPhone && (
                                    <li className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                                        <Phone className="size-4 shrink-0 text-(--brand)" />
                                        {config.contactPhone}
                                    </li>
                                )}
                                {config.contactEmail && (
                                    <li className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                                        <Mail className="size-4 shrink-0 text-(--brand)" />
                                        {config.contactEmail}
                                    </li>
                                )}
                                {address && (
                                    <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                        <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                        {address}
                                    </li>
                                )}
                            </>
                        )}
                    </ul>
                </div>

                <div className="flex flex-col gap-6">
                    {socials.length > 0 && (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                {tr(lang, 'aboutFollow')}
                            </h2>
                            <SocialButtons socials={socials} className="mt-4" />
                        </div>
                    )}

                    <Link
                        href="/stores"
                        className="group flex items-center justify-between rounded-2xl bg-linear-to-br from-(--brand) to-rose-500 p-6 text-white shadow-sm transition hover:opacity-95"
                    >
                        <span>
                            <span className="block text-lg font-bold">
                                {tr(lang, 'aboutVisit')}
                            </span>
                            <span className="text-sm text-white/85">
                                {tr(lang, 'aboutVisitSub')}
                            </span>
                        </span>
                        <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
