import Link from 'next/link';
import { fileUrl } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';
import type { MenuItem } from '@/lib/types';

export function SiteFooter({
    config,
    lang,
    menu = [],
}: {
    config: StoreConfig;
    lang: Lang;
    menu?: MenuItem[];
}) {
    const shopName = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const tagline = pick(lang, config.taglineEn, config.taglineKm);
    const description =
        pick(lang, config.footerDescriptionEn, config.footerDescriptionKm) ||
        tagline;

    const logo = fileUrl(config.logoUrl);
    const contacts = config.contacts.filter((c) => c.value?.trim());
    const socials = config.socials.filter((s) => s.url?.trim());

    return (
        <footer className="mt-16 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
                <div>
                    <div className="flex items-center gap-2">
                        {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logo}
                                alt={shopName}
                                className="h-8 w-auto object-contain"
                            />
                        ) : (
                            <span className="flex size-7 items-center justify-center rounded-lg bg-(--brand) text-xs font-bold text-white">
                                GS
                            </span>
                        )}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{shopName}</span>
                    </div>
                    {description && (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            {description}
                        </p>
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {tr(lang, 'shop')}
                    </h3>
                    <nav className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                        {menu.filter((m) => !m.parentId).length > 0 ? (
                            menu
                                .filter((m) => !m.parentId)
                                .map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.url}
                                    target={
                                        item.openInNewTab ? '_blank' : undefined
                                    }
                                    rel={
                                        item.openInNewTab
                                            ? 'noopener noreferrer'
                                            : undefined
                                    }
                                    className="hover:text-(--brand)"
                                >
                                    {pick(lang, item.labelEn, item.labelKm)}
                                </Link>
                            ))
                        ) : (
                            <>
                                <Link href="/" className="hover:text-(--brand)">
                                    {tr(lang, 'home')}
                                </Link>
                                <Link
                                    href="/products"
                                    className="hover:text-(--brand)"
                                >
                                    {tr(lang, 'allProducts')}
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {tr(lang, 'contact')}
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                        {contacts.map((c) => (
                            <li key={c.id}>{c.value}</li>
                        ))}
                    </ul>
                    {socials.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            {socials.map((s) => {
                                const icon = fileUrl(s.iconUrl);
                                return (
                                    <a
                                        key={s.id}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-(--brand) dark:text-zinc-400"
                                    >
                                        {icon ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={icon}
                                                alt={s.name}
                                                className="size-4 object-contain"
                                            />
                                        ) : null}
                                        {s.name}
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
                © {new Date().getFullYear()} {shopName}. All rights reserved.
            </div>
        </footer>
    );
}
