import Link from 'next/link';
import { LanguageToggle } from '@/components/language-toggle';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreConfig } from '@/lib/store-config';

export function SiteHeader({
    config,
    lang,
}: {
    config: StoreConfig;
    lang: Lang;
}) {
    const shopName = pick(lang, config.brandNameEn, config.brandNameKm) || 'Glitter';
    const announcement = pick(lang, config.announcementEn, config.announcementKm);

    return (
        <div className="sticky top-0 z-40">
            {config.announcementEnabled && announcement.trim() && (
                <div className="bg-(--brand) px-4 py-1.5 text-center text-xs font-medium text-white">
                    {announcement}
                </div>
            )}
            <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex shrink-0 items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-(--brand) text-sm font-bold text-white">
                            GS
                        </span>
                        <span className="text-lg font-bold tracking-tight text-zinc-900">
                            {shopName}
                        </span>
                    </Link>

                    {/* Nav */}
                    <nav className="ml-2 hidden items-center gap-1 sm:flex">
                        <Link
                            href="/"
                            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-(--brand)"
                        >
                            {tr(lang, 'home')}
                        </Link>
                        <Link
                            href="/products"
                            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-(--brand)"
                        >
                            {tr(lang, 'shop')}
                        </Link>
                    </nav>

                    {/* Search */}
                    <form
                        action="/products"
                        method="get"
                        className="ml-auto flex max-w-xs flex-1 items-center"
                    >
                        <div className="relative w-full">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="search"
                                name="search"
                                placeholder={tr(lang, 'search')}
                                className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:bg-white"
                            />
                        </div>
                    </form>

                    <LanguageToggle lang={lang} />
                </div>
            </header>
        </div>
    );
}
