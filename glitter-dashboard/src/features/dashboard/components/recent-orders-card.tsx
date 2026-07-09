'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { RecentOrder } from '@/types/dashboard';

const STATUS_STYLE: Record<string, { label: TranslationKey; cls: string }> = {
    pending: {
        label: 'order.status.pending',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    paid: {
        label: 'order.status.paid',
        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    },
    processing: {
        label: 'order.status.processing',
        cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    },
    shipped: {
        label: 'order.status.shipped',
        cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    },
    completed: {
        label: 'order.status.completed',
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    cancelled: {
        label: 'order.status.cancelled',
        cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
    },
    refunded: {
        label: 'order.status.refunded',
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    },
};

function timeAgo(iso: string, lang: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return lang === 'km' ? 'ឥឡូវ' : 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

export function RecentOrdersCard({ orders }: { orders: RecentOrder[] }) {
    const { t, language } = useI18n();

    return (
        <div className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold">
                        {t('dashboard.recentOrders.title')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                        {t('dashboard.recentOrders.sub')}
                    </p>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="text-xs font-medium text-pink-600 hover:underline dark:text-pink-400"
                >
                    {t('dashboard.viewAll')} →
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <ShoppingBag className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.recentOrders.empty')}
                    </p>
                </div>
            ) : (
                <ul className="divide-y">
                    {orders.map((o) => {
                        const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.pending;
                        return (
                            <li key={o.id}>
                                <Link
                                    href={`/dashboard/orders/${o.id}`}
                                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {o.orderNumber}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {o.customerName ||
                                                t('dashboard.recentOrders.guest')}{' '}
                                            · {timeAgo(o.createdAt, language)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                                        {formatPrice(o.grandTotal)}
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}
                                    >
                                        {t(st.label)}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
