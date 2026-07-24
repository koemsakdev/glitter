'use client';

import { Headphones, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';

export function FeaturesStrip({
    lang: initialLang,
    freeOver,
}: {
    lang: Lang;
    freeOver: number;
}) {
    const { lang } = useLang(initialLang);
    const items = [
        {
            Icon: Truck,
            title: tr(lang, 'featDelivery'),
            sub:
                freeOver > 0
                    ? `${tr(lang, 'featDeliverySub')} ${formatPrice(freeOver)}`
                    : tr(lang, 'featDeliveryAny'),
        },
        {
            Icon: ShieldCheck,
            title: tr(lang, 'featSecure'),
            sub: tr(lang, 'featSecureSub'),
        },
        {
            Icon: RotateCcw,
            title: tr(lang, 'featReturns'),
            sub: tr(lang, 'featReturnsSub'),
        },
        {
            Icon: Headphones,
            title: tr(lang, 'featSupport'),
            sub: tr(lang, 'featSupportSub'),
        },
    ];

    return (
        <section className="mx-auto mt-6 max-w-6xl px-4">
            <div className="grid grid-cols-2 gap-4 rounded-(--ui-radius) border border-zinc-100 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
                {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                            <it.Icon className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {it.title}
                            </p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {it.sub}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
