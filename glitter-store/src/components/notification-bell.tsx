'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { orderStatusLabel } from '@/lib/order-ui';
import { tr, type Lang } from '@/lib/locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface AppNotification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

const TITLE_KEY: Record<string, string> = {
    order_status: 'notif_order_status',
    payment_confirmed: 'notif_payment_confirmed',
    order_new: 'notif_order_new',
    review_new: 'notif_review_new',
};

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}


export function NotificationBell({ lang }: { lang: Lang }) {
    const { user, authFetch } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const r = await authFetch('/api/notifications');
            if (!r.ok) return;
            const d = (await r.json()) as {
                data: AppNotification[];
                unread: number;
            };
            setItems(d.data ?? []);
            setUnread(d.unread ?? 0);
        } catch {
            // ignore
        }
    }, [authFetch]);

    useEffect(() => {
        if (!user) return;
        void load();
        const src = new EventSource(`${API_URL}/api/realtime/events`);
        src.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data) as { entity?: string };
                if (d.entity === 'notifications') void load();
            } catch {
                // ignore
            }
        };
        return () => src.close();
    }, [user, load]);

    // Close on outside click.
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    // Guests: the bell just links to their account.
    if (!user) {
        return (
            <Link
                href="/account"
                aria-label={tr(lang, 'notifications')}
                title={tr(lang, 'notifications')}
                className="flex size-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:text-(--brand) dark:text-zinc-300 h-9 w-9 border border-neutral-200 dark:border-neutral-800"
            >
                <Bell className="size-4" />
            </Link>
        );
    }

    function describe(n: AppNotification): string {
        const d = n.data ?? {};
        const num = String(d.orderNumber ?? '');
        if (n.type === 'order_status' && d.status) {
            return `${num} · ${orderStatusLabel(lang, String(d.status))}`;
        }
        if (n.type === 'review_new') return String(d.productName ?? '');
        return num;
    }

    async function onItemClick(n: AppNotification) {
        if (!n.isRead) {
            try {
                await authFetch(`/api/notifications/${n.id}/read`, {
                    method: 'PATCH',
                });
            } catch {
                // ignore
            }
            void load();
        }
        setOpen(false);
        if (n.link) router.push(n.link);
    }

    async function markAll() {
        try {
            await authFetch('/api/notifications/read-all', { method: 'PATCH' });
        } catch {
            // ignore
        }
        void load();
    }

    return (
        <div ref={boxRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={tr(lang, 'notifications')}
                className="relative flex size-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:text-(--brand) dark:text-zinc-300 h-9 w-9 border border-neutral-200 dark:border-neutral-800"
            >
                <Bell className="size-4" />
                {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-(--brand) px-1 text-[10px] font-bold leading-4 text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'notifications')}
                        </p>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAll}
                                className="inline-flex items-center gap-1 text-xs font-medium text-(--brand) hover:underline"
                            >
                                <Check className="size-3.5" />
                                {tr(lang, 'markAllRead')}
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <Bell className="size-7 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm text-zinc-400">
                                {tr(lang, 'notifEmpty')}
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto py-1">
                            {items.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => onItemClick(n)}
                                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                                        n.isRead
                                            ? ''
                                            : 'bg-(--brand)/5'
                                    }`}
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                                        <Package className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {tr(lang, TITLE_KEY[n.type] ?? 'notifications')}
                                        </span>
                                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {describe(n)}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] text-zinc-400">
                                        {timeAgo(n.createdAt)}
                                    </span>
                                    {!n.isRead && (
                                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-(--brand)" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
