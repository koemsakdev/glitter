'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/api';
import { tr, type Lang } from '@/lib/locale';
import {
    ORDER_STATUS_STYLE,
    PAYMENT_STATUS_STYLE,
    orderStatusLabel,
    paymentStatusLabel,
} from '@/lib/order-ui';
import type { OrderSummary } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export function OrdersView({ lang }: { lang: Lang }) {
    const router = useRouter();
    const { user, loading, authFetch } = useAuth();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        function load() {
            authFetch('/api/account/orders')
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((d: { data?: OrderSummary[] }) => {
                    if (active) setOrders(d.data ?? []);
                })
                .catch(() => {})
                .finally(() => {
                    if (active) setOrdersLoading(false);
                });
        }
        load();
        const src = new EventSource(`${API_URL}/api/realtime/events`);
        src.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data) as { entity?: string };
                if (d.entity === 'orders') load();
            } catch {
                // ignore
            }
        };
        return () => {
            active = false;
            src.close();
        };
    }, [user, authFetch]);

    return (
        <div className="stagger mx-auto max-w-3xl px-4 py-10">
            <BackLink lang={lang} fallbackHref="/account" className="mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'myOrders')}
            </h1>

            <div className="mt-6 space-y-3">
                {ordersLoading ? (
                    <div className="animate-pulse space-y-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-28 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                            />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
                        <Package className="size-8 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-sm text-zinc-400">
                            {tr(lang, 'noOrders')}
                        </p>
                        <Link
                            href="/products"
                            className="mt-1 text-sm font-semibold text-(--brand) hover:underline"
                        >
                            {tr(lang, 'continueShopping')}
                        </Link>
                    </div>
                ) : (
                    orders.map((o) => (
                        <Link
                            key={o.id}
                            href={`/account/orders/${o.id}`}
                            className="group block rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--brand)/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        {o.orderNumber}
                                    </p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        <span>
                                            {new Date(
                                                o.createdAt,
                                            ).toLocaleDateString(
                                                lang === 'km'
                                                    ? 'km-KH'
                                                    : 'en-US',
                                                {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                },
                                            )}
                                        </span>
                                        {o.itemCount ? (
                                            <span className="text-zinc-300 dark:text-zinc-600">
                                                •
                                            </span>
                                        ) : null}
                                        {o.itemCount ? (
                                            <span>
                                                {o.itemCount}{' '}
                                                {tr(lang, 'itemsLabel')}
                                            </span>
                                        ) : null}
                                        {o.deliveryMethodName ? (
                                            <span className="text-zinc-300 dark:text-zinc-600">
                                                •
                                            </span>
                                        ) : null}
                                        {o.deliveryMethodName ? (
                                            <span>{o.deliveryMethodName}</span>
                                        ) : null}
                                    </p>
                                </div>
                                <p className="shrink-0 text-lg font-extrabold text-(--brand)">
                                    {formatPrice(o.grandTotal)}
                                </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                <div className="flex flex-wrap gap-1.5">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                            ORDER_STATUS_STYLE[o.status] ??
                                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                        }`}
                                    >
                                        {orderStatusLabel(lang, o.status)}
                                    </span>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                            PAYMENT_STATUS_STYLE[
                                                o.paymentStatus
                                            ] ??
                                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                        }`}
                                    >
                                        {paymentStatusLabel(
                                            lang,
                                            o.paymentStatus,
                                        )}
                                    </span>
                                </div>
                                <span className="flex items-center gap-0.5 text-xs font-semibold text-zinc-400 transition-colors group-hover:text-(--brand)">
                                    {tr(lang, 'viewDetails')}
                                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                </span>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
