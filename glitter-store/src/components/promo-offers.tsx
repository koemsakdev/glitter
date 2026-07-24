'use client';

import { useState } from 'react';
import { BadgePercent, Check, Clock, Copy, Sparkles } from 'lucide-react';
import { pick, tr, type Lang } from '@/lib/locale';
import type { PublicPromo } from '@/lib/api';

function fmtDate(d: string): string {
    const dt = new Date(`${d.slice(0, 10)}T00:00:00`);
    return dt.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

export function PromoOffers({
    promos,
    lang,
    title,
    subtitle,
}: {
    promos: PublicPromo[];
    lang: Lang;
    title?: string;
    subtitle?: string;
}) {
    const [copied, setCopied] = useState<string | null>(null);
    if (promos.length === 0) return null;

    // Column count follows how many coupons there are: 1 → full width,
    // 2 → two columns, 3+ → three columns (stacked on mobile).
    const gridCols =
        promos.length === 1
            ? 'grid-cols-1'
            : promos.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    function copy(code: string) {
        navigator.clipboard?.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    }

    return (
        <section className="mt-8">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title ?? tr(lang, 'offersTitle')}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle ?? tr(lang, 'offersSubtitle')}
            </p>

            <div className={`mt-4 grid gap-3 ${gridCols}`}>
                {promos.map((p, i) => {
                    const amount =
                        p.discountType === 'percent'
                            ? `${p.discountValue}%`
                            : `$${p.discountValue}`;
                    const headline =
                        p.appliesTo === 'delivery'
                            ? p.discountType === 'percent' &&
                              p.discountValue >= 100
                                ? tr(lang, 'freeDelivery')
                                : `${amount} ${tr(lang, 'offDelivery')}`
                            : `${amount} ${tr(lang, 'promoOff')}`;
                    const name = pick(lang, p.nameEn, p.nameKm);
                    return (
                        <div
                            key={p.code ?? `auto-${i}`}
                            className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            {/* Accent stub, like a ticket */}
                            <div className="flex w-14 shrink-0 items-center justify-center bg-(--brand)/10 text-(--brand)">
                                <BadgePercent className="size-6" />
                            </div>

                            <div className="min-w-0 flex-1 p-4">
                                <div className="text-lg font-extrabold text-(--brand)">
                                    {headline}
                                </div>
                                {name && (
                                    <div className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        {name}
                                    </div>
                                )}
                                <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    {p.minSpend > 0 && (
                                        <span>
                                            {tr(lang, 'minOrder').replace(
                                                '{amount}',
                                                `$${p.minSpend}`,
                                            )}
                                        </span>
                                    )}
                                    {p.discountType === 'percent' &&
                                        !!p.maxDiscount &&
                                        p.maxDiscount > 0 && (
                                            <span>
                                                {tr(lang, 'capUpTo').replace(
                                                    '{amount}',
                                                    `$${p.maxDiscount}`,
                                                )}
                                            </span>
                                        )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {p.code ? (
                                        <button
                                            type="button"
                                            onClick={() => copy(p.code!)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-(--brand)/50 bg-(--brand)/5 px-2.5 py-1 font-mono text-sm font-bold text-(--brand) transition-colors hover:bg-(--brand)/10"
                                        >
                                            {p.code}
                                            {copied === p.code ? (
                                                <Check className="size-3.5" />
                                            ) : (
                                                <Copy className="size-3.5" />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                                            <Sparkles className="size-3.5" />
                                            {tr(lang, 'autoApplies')}
                                        </span>
                                    )}
                                    {(p.firstOrderOnly ||
                                        p.newAccountDays != null) && (
                                        <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                                            {tr(lang, 'newCustomersBadge')}
                                        </span>
                                    )}
                                    {p.endAt && (
                                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                                            <Clock className="size-3.5" />
                                            {tr(lang, 'endsOn').replace(
                                                '{date}',
                                                fmtDate(p.endAt),
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
