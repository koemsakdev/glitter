'use client';

import { Bell, X } from 'lucide-react';
import { toast as sonner } from 'sonner';
import type { AppNotification } from '@/features/notifications/notification-api';
import {
    describeNotification,
    notificationHref,
    TYPE_META,
} from '@/features/notifications/notification-meta';
import { useI18n } from '@/lib/i18n';

/**
 * Chat-style pop-up for a live notification (like a new message bubble):
 * icon, title, detail and "just now". Clicking it opens the related page.
 */
export function NotificationToast({
    id,
    notification: n,
    onOpen,
}: {
    id: string | number;
    notification: AppNotification;
    onOpen: (href: string) => void;
}) {
    const { t } = useI18n();
    const meta = TYPE_META[n.type];
    const Icon = meta?.icon ?? Bell;
    const href = notificationHref(n);
    const detail = describeNotification(n, t);

    return (
        <div
            role="status"
            className="group relative flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border bg-popover p-3.5 pr-9 text-popover-foreground shadow-xl shadow-black/10 animate-in slide-in-from-right-4 fade-in"
        >
            <button
                type="button"
                className="absolute inset-0"
                aria-label={meta ? t(meta.titleKey) : n.type}
                onClick={() => {
                    sonner.dismiss(id);
                    if (href) onOpen(href);
                }}
            />
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                <Icon className="size-5" />
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-pink-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full border-2 border-popover bg-pink-500" />
                </span>
            </span>
            <span className="pointer-events-none min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                        {meta ? t(meta.titleKey) : n.type}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                        {t('notifications.justNow')}
                    </span>
                </span>
                {detail && (
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {detail}
                    </span>
                )}
                {href && (
                    <span className="mt-1.5 inline-block text-xs font-medium text-pink-600 dark:text-pink-400">
                        {t('notifications.view')} →
                    </span>
                )}
            </span>
            <button
                type="button"
                onClick={() => sonner.dismiss(id)}
                aria-label={t('common.close')}
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:opacity-100"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}
