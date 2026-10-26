'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';
import { onLiveChange } from '@/lib/realtime';
import {
    describeNotification,
    NOTIF_TITLE_KEY,
    timeAgo,
    type AppNotification,
    type NotificationPage,
} from '@/lib/notifications';

export function NotificationBell({ lang }: { lang: Lang }) {
    const { user, authFetch } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    // Opening the bell clears the badge (all marked read); what was new stays
    // highlighted until it closes — same as the dashboard.
    const [fresh, setFresh] = useState<Set<string>>(() => new Set());
    const boxRef = useRef<HTMLDivElement>(null);

    const fetchList =
        useCallback(async (): Promise<NotificationPage | null> => {
            try {
                const r = await authFetch('/api/notifications');
                return r.ok ? ((await r.json()) as NotificationPage) : null;
            } catch {
                return null;
            }
        }, [authFetch]);

    const load = useCallback(
        () =>
            fetchList().then((d) => {
                if (!d) return;
                setItems(d.data ?? []);
                setUnread(d.unread ?? 0);
            }),
        [fetchList],
    );

    useEffect(() => {
        if (!user) return;
        let active = true;
        const refresh = () =>
            void fetchList().then((d) => {
                if (!active || !d) return;
                setItems(d.data ?? []);
                setUnread(d.unread ?? 0);
            });
        refresh();
        const off = onLiveChange(['notifications'], refresh);
        return () => {
            active = false;
            off();
        };
    }, [user, fetchList]);

    // Close on outside click.
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false);
                setFresh(new Set());
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
        setFresh(new Set());
        if (n.link) router.push(n.link);
    }

    function toggle() {
        // Phones: open the full Notifications screen, like a native app.
        if (window.matchMedia('(max-width: 767px)').matches) {
            router.push('/account/notifications');
            return;
        }
        if (open) {
            setOpen(false);
            setFresh(new Set());
            return;
        }
        setOpen(true);
        if (unread > 0) {
            setFresh(new Set(items.filter((n) => !n.isRead).map((n) => n.id)));
            setItems((list) => list.map((n) => ({ ...n, isRead: true })));
            setUnread(0);
            void markAll();
        }
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
                onClick={toggle}
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
                                        n.isRead && !fresh.has(n.id)
                                            ? ''
                                            : 'bg-(--brand)/5'
                                    }`}
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                                        <Package className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {tr(
                                                lang,
                                                NOTIF_TITLE_KEY[n.type] ??
                                                    'notifications',
                                            )}
                                        </span>
                                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {describeNotification(n, lang)}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] text-zinc-400">
                                        {timeAgo(n.createdAt)}
                                    </span>
                                    {(!n.isRead || fresh.has(n.id)) && (
                                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-(--brand)" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    <Link
                        href="/account/notifications"
                        onClick={() => {
                            setOpen(false);
                            setFresh(new Set());
                        }}
                        className="block border-t border-zinc-100 px-4 py-2.5 text-center text-xs font-semibold text-(--brand) transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                    >
                        {tr(lang, 'notifSeeAll')}
                    </Link>
                </div>
            )}
        </div>
    );
}
