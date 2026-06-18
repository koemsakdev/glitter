import Link from 'next/link';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';

export function SiteFooter({
    config,
    lang,
}: {
    config: StoreConfig;
    lang: Lang;
}) {
    const shopName = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const tagline = pick(lang, config.taglineEn, config.taglineKm);
    const address = pick(lang, config.contactAddressEn, config.contactAddressKm);

    const socials = [
        { label: 'Facebook', url: config.facebookUrl },
        { label: 'Instagram', url: config.instagramUrl },
        { label: 'Telegram', url: config.telegramUrl },
    ].filter((s) => s.url?.trim());

    return (
        <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-(--brand) text-xs font-bold text-white">
                            GS
                        </span>
                        <span className="font-semibold text-zinc-900">{shopName}</span>
                    </div>
                    {tagline && <p className="mt-2 text-sm text-zinc-500">{tagline}</p>}
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {tr(lang, 'shop')}
                    </h3>
                    <nav className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600">
                        <Link href="/" className="hover:text-(--brand)">
                            {tr(lang, 'home')}
                        </Link>
                        <Link href="/products" className="hover:text-(--brand)">
                            {tr(lang, 'allProducts')}
                        </Link>
                    </nav>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {tr(lang, 'contact')}
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-zinc-600">
                        {config.contactPhone?.trim() && <li>{config.contactPhone}</li>}
                        {config.contactEmail?.trim() && <li>{config.contactEmail}</li>}
                        {address.trim() && <li>{address}</li>}
                    </ul>
                    {socials.length > 0 && (
                        <div className="mt-3 flex gap-3 text-sm">
                            {socials.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-500 hover:text-(--brand)"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-400">
                © {new Date().getFullYear()} {shopName}. All rights reserved.
            </div>
        </footer>
    );
}
