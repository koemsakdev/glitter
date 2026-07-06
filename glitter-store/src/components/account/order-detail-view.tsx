'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapPin, Package, Store } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/lib/auth';
import { fileUrl, formatPrice } from '@/lib/api';
import { tr, type Lang } from '@/lib/locale';
import {
    ORDER_STATUS_STYLE,
    PAYMENT_STATUS_STYLE,
    orderStatusLabel,
    paymentStatusLabel,
} from '@/lib/order-ui';
import type { OrderDetail } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export function OrderDetailView({ lang, id }: { lang: Lang; id: string }) {
    const router = useRouter();
    const { user, loading, authFetch } = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'notfound'>(
        'loading',
    );

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        function load() {
            authFetch(`/api/account/orders/${id}`)
                .then((r) => {
                    if (!r.ok) throw new Error('not found');
                    return r.json();
                })
                .then((d: { data?: OrderDetail }) => {
                    if (!active) return;
                    if (d.data) {
                        setOrder(d.data);
                        setState('ready');
                    } else {
                        setState('notfound');
                    }
                })
                .catch(() => active && setState('notfound'));
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
    }, [user, authFetch, id]);

    if (state === 'loading') {
        return (
            <div className="mx-auto max-w-3xl animate-pulse px-4 py-10">
                <div className="mb-4 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-28 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
                <div className="mt-4 h-48 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
        );
    }

    if (state === 'notfound' || !order) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-10">
                <BackLink lang={lang} fallbackHref="/account/orders" className="mb-6" />
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
                    <Package className="size-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-400">
                        {tr(lang, 'orderNotFound')}
                    </p>
                </div>
            </div>
        );
    }

    const proof = fileUrl(order.paymentProofUrl);
    const dateStr = new Date(order.createdAt).toLocaleString(
        lang === 'km' ? 'km-KH' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );

    return (
        <div className="stagger mx-auto max-w-3xl px-4 py-10">
            <BackLink lang={lang} fallbackHref="/account/orders" className="mb-4" />

            {/* Header */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {tr(lang, 'placedOn')} {dateStr}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                ORDER_STATUS_STYLE[order.status] ??
                                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                        >
                            {orderStatusLabel(lang, order.status)}
                        </span>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                PAYMENT_STATUS_STYLE[order.paymentStatus] ??
                                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                        >
                            {paymentStatusLabel(lang, order.paymentStatus)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Items */}
            <Section title={tr(lang, 'orderItems')}>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {order.items.map((it) => {
                        // Show the colour as a swatch, never a raw hex code.
                        const swatch = it.color?.startsWith('#')
                            ? it.color
                            : null;
                        const colorName =
                            it.color && !it.color.startsWith('#')
                                ? it.color
                                : null;
                        const variant = [it.size, colorName]
                            .filter(Boolean)
                            .join(' · ');
                        const img = fileUrl(it.productImageUrl);
                        return (
                            <div
                                key={it.id}
                                className="flex items-center gap-3 px-5 py-3.5"
                            >
                                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                                    {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={img}
                                            alt={it.productName}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <Package className="size-5" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {it.productName}
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        {swatch && (
                                            <span
                                                className="inline-block size-3 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700"
                                                style={{
                                                    backgroundColor: swatch,
                                                }}
                                            />
                                        )}
                                        <span>
                                            {variant ? `${variant} · ` : ''}
                                            {tr(lang, 'qty')} {it.quantity} ×{' '}
                                            {formatPrice(it.unitPrice)}
                                        </span>
                                    </p>
                                </div>
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(it.lineTotal)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Section>

            {/* Delivery */}
            <Section title={tr(lang, 'deliveryInfo')}>
                <div className="space-y-2 px-5 py-4 text-sm">
                    {order.deliveryMethodName && (
                        <Row
                            icon={Store}
                            label={order.deliveryMethodName}
                            value={order.deliveryRegionName ?? ''}
                        />
                    )}
                    {order.deliveryAddress && (
                        <Row
                            icon={MapPin}
                            label={tr(lang, 'deliverTo')}
                            value={order.deliveryAddress}
                        />
                    )}
                    {order.branchName && (
                        <Row
                            icon={Store}
                            label={tr(lang, 'branch')}
                            value={order.branchName}
                        />
                    )}
                </div>
            </Section>

            {/* Payment */}
            <Section title={tr(lang, 'paymentInfo')}>
                <div className="space-y-3 px-5 py-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">
                            {order.paymentMethodName ??
                                order.paymentMethod ??
                                '—'}
                        </span>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                PAYMENT_STATUS_STYLE[order.paymentStatus] ??
                                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                        >
                            {paymentStatusLabel(lang, order.paymentStatus)}
                        </span>
                    </div>
                    {proof && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {tr(lang, 'paymentProof')}
                            </p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={proof}
                                alt="proof"
                                className="max-h-56 rounded-xl border border-zinc-200 object-contain dark:border-zinc-700"
                            />
                        </div>
                    )}
                </div>
            </Section>

            {/* Totals */}
            <Section title={tr(lang, 'orderSummary')}>
                <div className="space-y-2 px-5 py-4 text-sm">
                    <Total
                        label={tr(lang, 'subtotal')}
                        value={formatPrice(order.subtotal)}
                    />
                    {order.discountTotal > 0 && (
                        <Total
                            label={tr(lang, 'discount')}
                            value={`- ${formatPrice(order.discountTotal)}`}
                        />
                    )}
                    <Total
                        label={tr(lang, 'deliveryFee')}
                        value={
                            order.shippingCost > 0
                                ? formatPrice(order.shippingCost)
                                : tr(lang, 'free')
                        }
                    />
                    {order.taxAmount > 0 && (
                        <Total
                            label={tr(lang, 'tax')}
                            value={formatPrice(order.taxAmount)}
                        />
                    )}
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'total')}
                        </span>
                        <span className="text-lg font-extrabold text-(--brand)">
                            {formatPrice(order.grandTotal)}
                        </span>
                    </div>
                </div>
            </Section>

            {order.note && (
                <Section title={tr(lang, 'orderNote')}>
                    <p className="px-5 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {order.note}
                    </p>
                </Section>
            )}
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="border-b border-zinc-100 px-5 py-3 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                {title}
            </p>
            {children}
        </div>
    );
}

function Row({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof MapPin;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-(--brand)" />
            <span className="min-w-0">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {label}
                </span>
                {value && (
                    <span className="block text-zinc-500 dark:text-zinc-400">
                        {value}
                    </span>
                )}
            </span>
        </div>
    );
}

function Total({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {value}
            </span>
        </div>
    );
}
