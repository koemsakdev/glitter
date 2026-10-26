'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2, Package } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { MobileAppBar } from '@/components/ui/mobile-app-bar';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import {
    describeNotification,
    NOTIF_TITLE_KEY,
    type AppNotification,
    type NotificationPage,
} from '@/lib/notifications';
import { onLiveChange } from '@/lib/realtime';

type Filter = 'all' | 'unread';
const PAGE = 20;

function dayLabel(iso: string, lang: Lang): string {
    const d = new Date(iso);
    const today = new Date();
    const start = (x: Date) =>
        new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(today) - start(d)) / 86_400_000);
    if (diff === 0) return tr(lang, 'notifToday');
    if (diff === 1) return tr(lang, 'notifYesterday');
    return d.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        weekday: diff < 7 ? 'long' : undefined,
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
}

/** The shopper's full notification history (newest first, paged). */
export function NotificationsView({ lang: initialLang }: { lang: Lang }) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const { user, loading, authFetch } = useAuth();
    const [filter, setFilter] = useState<Filter>('all');
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [state, setState] = useState<'loading' | 'ready'>('loading');
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    const fetchPage = useCallback(
        async (before?: string): Promise<NotificationPage | null> => {
            const qs = new URLSearchParams({ limit: String(PAGE) });
            if (before) qs.set('before', before);
            if (filter === 'unread') qs.set('unread', 'true');
            try {
                const r = await authFetch(`/api/notifications?${qs}`);
                return r.ok ? ((await r.json()) as NotificationPage) : null;
            } catch {
                return null;
            }
        },
        [authFetch, filter],
    );

    // First page (and again on live changes / filter switch).
    useEffect(() => {
        if (!user) return;
        let active = true;
        const load = () =>
            void fetchPage().then((d) => {
                if (!active || !d) return;
                setItems(d.data);
                setUnread(d.unread);
                setHasMore(Boolean(d.hasMore));
                setState('ready');
            });
        load();
        const off = onLiveChange(['notifications'], load);
        return () => {
            active = false;
            off();
        };
    }, [user, fetchPage]);

    async function loadOlder() {
        const last = items[items.length - 1];
        if (!last) return;
        setLoadingMore(true);
        const d = await fetchPage(last.createdAt);
        setLoadingMore(false);
        if (!d) return;
        setItems((list) => [...list, ...d.data]);
        setHasMore(Boolean(d.hasMore));
    }

    async function open(n: AppNotification) {
        if (!n.isRead) {
            setItems((list) =>
                list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
            );
            setUnread((u) => Math.max(0, u - 1));
            void authFetch(`/api/notifications/${n.id}/read`, {
                method: 'PATCH',
            }).catch(() => {});
        }
        if (n.link) router.push(n.link);
    }

    async function markAll() {
        setItems((list) => list.map((x) => ({ ...x, isRead: true })));
        setUnread(0);
        await authFetch('/api/notifications/read-all', {
            method: 'PATCH',
        }).catch(() => {});
    }

    const groups: { label: string; items: AppNotification[] }[] = [];
    for (const n of items) {
        const label = dayLabel(n.createdAt, lang);
        const last = groups[groups.length - 1];
        if (last?.label === label) last.items.push(n);
        else groups.push({ label, items: [n] });
    }

    return (
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-0 md:p-8">
            <MobileAppBar
                lang={lang}
                title={tr(lang, 'notifications')}
                fallbackHref="/account"
                action={
                    unread > 0 ? (
                        <button
                            type="button"
                            onClick={() => void markAll()}
                            aria-label={tr(lang, 'markAllRead')}
                            title={tr(lang, 'markAllRead')}
                            className="flex size-11 items-center justify-center rounded-full text-(--brand) active:scale-95"
                        >
                            <CheckCheck className="size-5" />
                        </button>
                    ) : null
                }
            />
            <div className="hidden md:block">
                <BackLink
                    lang={lang}
                    fallbackHref="/account"
                    className="mb-4"
                />
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'notifications')}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'notifSubtitle')}
                </p>
            </div>

            {/* All / Unread + mark all read */}
            <div className="flex items-center justify-between gap-3 md:mt-6">
                <div className="grid w-full grid-cols-2 rounded-xl bg-zinc-100 p-1 md:inline-grid md:w-auto dark:bg-zinc-800">
                    {(['all', 'unread'] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => {
                                setFilter(f);
                                setState('loading');
                            }}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-5 py-1.5 text-sm font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-(--brand)/40 ${
                                filter === f
                                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                        >
                            {f === 'all'
                                ? tr(lang, 'notifAll')
                                : tr(lang, 'notifUnread')}
                            {f === 'unread' && unread > 0 && (
                                <span className="rounded-full bg-(--brand) px-1.5 text-[10px] font-bold leading-4 text-white">
                                    {unread}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                {unread > 0 && (
                    <button
                        type="button"
                        onClick={() => void markAll()}
                        className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-(--brand) hover:underline md:inline-flex"
                    >
                        <CheckCheck className="size-3.5" />
                        {tr(lang, 'markAllRead')}
                    </button>
                )}
            </div>

            <div className="mt-4">
                {state === 'loading' ? (
                    <div className="animate-pulse space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-16 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                            />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
                        <Bell className="size-8 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-sm text-zinc-400">
                            {filter === 'unread'
                                ? tr(lang, 'notifNoUnread')
                                : tr(lang, 'notifEmpty')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groups.map((g) => (
                            <section key={g.label}>
                                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {g.label}
                                </p>
                                <ul className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                    {g.items.map((n) => (
                                        <li
                                            key={n.id}
                                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => void open(n)}
                                                className={`flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-zinc-50 active:bg-zinc-100 focus-visible:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800 ${
                                                    n.isRead
                                                        ? ''
                                                        : 'bg-(--brand)/5'
                                                }`}
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                                                    <Package className="size-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {tr(
                                                            lang,
                                                            NOTIF_TITLE_KEY[
                                                                n.type
                                                            ] ??
                                                                'notifications',
                                                        )}
                                                    </span>
                                                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                        {describeNotification(
                                                            n,
                                                            lang,
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-[11px] text-zinc-400">
                                                    {new Date(
                                                        n.createdAt,
                                                    ).toLocaleTimeString(
                                                        lang === 'km'
                                                            ? 'km-KH'
                                                            : 'en-US',
                                                        {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        },
                                                    )}
                                                </span>
                                                {!n.isRead && (
                                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-(--brand)" />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}

                        {hasMore && (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void loadOlder()}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                >
                                    {loadingMore && (
                                        <Loader2 className="size-4 animate-spin" />
                                    )}
                                    {tr(lang, 'notifLoadOlder')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
