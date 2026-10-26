'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTableFilterTabs } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useNotifications,
    type AppNotification,
    type NotificationList,
} from '@/features/notifications/notification-api';
import {
    describeNotification,
    notificationHref,
    TYPE_META,
} from '@/features/notifications/notification-meta';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'unread';
const PAGE = 30;

/** Label for the day group a notification falls in. */
function dayLabel(iso: string, lang: string): string {
    const d = new Date(iso);
    const today = new Date();
    const start = (x: Date) =>
        new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(today) - start(d)) / 86_400_000);
    if (diff === 0) return lang === 'km' ? 'ថ្ងៃនេះ' : 'Today';
    if (diff === 1) return lang === 'km' ? 'ម្សិលមិញ' : 'Yesterday';
    return d.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        weekday: diff < 7 ? 'long' : undefined,
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
}

/** Full notification history, newest first, paged with "Load older". */
export function NotificationsView() {
    const { t, language } = useI18n();
    const router = useRouter();
    const { unread, markRead, markAll } = useNotifications();
    const [filter, setFilter] = useState<Filter>('all');

    const query = useInfiniteQuery({
        // Under ['notifications'] so live updates and mark-read refresh it too.
        queryKey: ['notifications', 'history', filter],
        initialPageParam: '',
        queryFn: async ({ pageParam }) => {
            const { data } = await apiClient.get<NotificationList>(
                '/api/notifications',
                {
                    params: {
                        limit: PAGE,
                        before: pageParam || undefined,
                        unread: filter === 'unread' ? 'true' : undefined,
                    },
                },
            );
            return data;
        },
        getNextPageParam: (last) =>
            last.hasMore && last.data.length
                ? last.data[last.data.length - 1].createdAt
                : undefined,
    });

    const items = query.data?.pages.flatMap((p) => p.data) ?? [];
    const groups: { label: string; items: AppNotification[] }[] = [];
    for (const n of items) {
        const label = dayLabel(n.createdAt, language);
        const last = groups[groups.length - 1];
        if (last?.label === label) last.items.push(n);
        else groups.push({ label, items: [n] });
    }

    function open(n: AppNotification) {
        if (!n.isRead) markRead.mutate(n.id);
        const href = notificationHref(n);
        if (href) router.push(href);
    }

    return (
        <div className="space-y-6">
            {/* Header — same pattern as other pages */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('notifications.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('notifications.pageSubtitle')}
                    </p>
                </div>
                {unread > 0 && (
                    <Button
                        variant="outline"
                        className="sm:shrink-0"
                        onClick={() => markAll.mutate()}
                        disabled={markAll.isPending}
                    >
                        <CheckCheck className="size-4" />
                        {t('notifications.markAllRead')}
                    </Button>
                )}
            </div>

            {/* All / Unread */}
            <DataTableFilterTabs<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                    { value: 'all', label: t('notifications.filterAll') },
                    {
                        value: 'unread',
                        label:
                            unread > 0
                                ? `${t('notifications.filterUnread')} (${unread})`
                                : t('notifications.filterUnread'),
                    },
                ]}
            />

            <div className="overflow-hidden rounded-xl border bg-card">
                {query.isLoading ? (
                    <div className="space-y-3 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="size-9 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-1/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                        <Bell className="size-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            {filter === 'unread'
                                ? t('notifications.noUnread')
                                : t('notifications.empty')}
                        </p>
                    </div>
                ) : (
                    groups.map((g) => (
                        <section key={g.label}>
                            <p className="sticky top-0 z-10 border-b bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                                {g.label}
                            </p>
                            <ul className="divide-y">
                                {g.items.map((n) => {
                                    const meta = TYPE_META[n.type];
                                    const Icon = meta?.icon ?? Bell;
                                    const detail = describeNotification(n, t);
                                    return (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => open(n)}
                                                className={cn(
                                                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                                                    !n.isRead &&
                                                        'bg-pink-50/60 dark:bg-pink-500/5',
                                                )}
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                                                    <Icon className="size-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-medium">
                                                        {meta
                                                            ? t(meta.titleKey)
                                                            : n.type}
                                                    </span>
                                                    {detail && (
                                                        <span className="block truncate text-xs text-muted-foreground">
                                                            {detail}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                                    {new Date(
                                                        n.createdAt,
                                                    ).toLocaleTimeString(
                                                        language === 'km'
                                                            ? 'km-KH'
                                                            : 'en-US',
                                                        {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        },
                                                    )}
                                                </span>
                                                {!n.isRead && (
                                                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-pink-500" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))
                )}
            </div>

            {query.hasNextPage && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => void query.fetchNextPage()}
                        disabled={query.isFetchingNextPage}
                    >
                        {query.isFetchingNextPage && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {t('notifications.loadOlder')}
                    </Button>
                </div>
            )}
        </div>
    );
}
