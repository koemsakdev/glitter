'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/api';
import { tr, type Lang } from '@/lib/locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface OrderRow {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    itemCount?: number;
}

const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
};

export function AccountView({ lang }: { lang: Lang }) {
    const router = useRouter();
    const { user, loading, logout, authFetch } = useAuth();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        let active = true;

        function loadOrders() {
            authFetch('/api/account/orders')
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((d: { data?: OrderRow[] }) => {
                    if (active) setOrders(d.data ?? []);
                })
                .catch(() => {})
                .finally(() => {
                    if (active) setOrdersLoading(false);
                });
        }

        loadOrders();

        // Live: refetch when the dashboard changes an order (status, payment…).
        const source = new EventSource(`${API_URL}/api/realtime/events`);
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { entity?: string };
                if (data.entity === 'orders') loadOrders();
            } catch {
                // ignore malformed events
            }
        };

        return () => {
            active = false;
            source.close();
        };
    }, [user, authFetch]);

    if (loading || !user) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-zinc-400">
                …
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-12">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                    <UserAvatar
                        src={user.profileImageUrl}
                        name={user.fullName}
                        className="size-16 shrink-0 rounded-full text-xl"
                    />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {user.fullName || tr(lang, 'account')}
                        </h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {user.email}
                        </p>
                        {user.phoneNumber && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {user.phoneNumber}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        void logout().then(() => router.push('/'));
                    }}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900"
                >
                    {tr(lang, 'logout')}
                </button>
            </div>

            <div className="mt-6">
                <Link
                    href="/account/wishlist"
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900"
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="size-4 text-(--brand)"
                        fill="currentColor"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {tr(lang, 'myWishlist')}
                </Link>
            </div>

            <h2 className="mt-10 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'myOrders')}
            </h2>

            <div className="mt-4 space-y-3">
                {ordersLoading ? (
                    <p className="text-sm text-zinc-400">…</p>
                ) : orders.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 py-12 text-center text-sm text-zinc-400">
                        {tr(lang, 'noOrders')}
                    </p>
                ) : (
                    orders.map((o) => (
                        <div
                            key={o.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
                        >
                            <div>
                                <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {o.orderNumber}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {new Date(o.createdAt).toLocaleDateString(
                                        lang === 'km' ? 'km-KH' : 'en-US',
                                        {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        },
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        STATUS_STYLE[o.status] ??
                                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                    }`}
                                >
                                    {o.status}
                                </span>
                                <span className="text-sm font-bold text-(--brand)">
                                    {formatPrice(o.grandTotal)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
