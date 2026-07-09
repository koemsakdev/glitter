'use client';

import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { OrdersByStatus } from '@/types/dashboard';

const STATUSES: {
    key: keyof OrdersByStatus;
    label: TranslationKey;
    color: string;
}[] = [
    { key: 'pending', label: 'order.status.pending', color: 'bg-amber-500' },
    { key: 'paid', label: 'order.status.paid', color: 'bg-blue-500' },
    {
        key: 'processing',
        label: 'order.status.processing',
        color: 'bg-violet-500',
    },
    { key: 'shipped', label: 'order.status.shipped', color: 'bg-cyan-500' },
    {
        key: 'completed',
        label: 'order.status.completed',
        color: 'bg-emerald-500',
    },
    { key: 'cancelled', label: 'order.status.cancelled', color: 'bg-zinc-400' },
    { key: 'refunded', label: 'order.status.refunded', color: 'bg-rose-500' },
];

export function OrderStatusCard({ data }: { data: OrdersByStatus }) {
    const { t } = useI18n();
    const total = STATUSES.reduce((s, x) => s + data[x.key], 0);
    const visible = STATUSES.filter((x) => data[x.key] > 0);

    return (
        <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-sm font-semibold">
                        {t('dashboard.orderStatus.title')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                        {t('dashboard.orderStatus.sub')}
                    </p>
                </div>
                <span className="text-xl font-bold tabular-nums text-foreground">
                    {total}
                </span>
            </div>

            {total === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    {t('dashboard.orderStatus.empty')}
                </p>
            ) : (
                <ul className="mt-5 space-y-3.5">
                    {visible.map((x) => {
                        const v = data[x.key];
                        const pct = (v / total) * 100;
                        return (
                            <li key={x.key}>
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 font-medium">
                                        <span
                                            className={`size-2 rounded-full ${x.color}`}
                                        />
                                        {t(x.label)}
                                    </span>
                                    <span className="tabular-nums text-muted-foreground">
                                        {v}
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full ${x.color}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
