'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    AlertTriangle,
    BadgeCheck,
    Bell,
    Package,
    ShoppingBag,
    Star,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    useNotifications,
    type AppNotification,
} from '@/features/notifications/notification-api';
import { useI18n, type TranslationKey } from '@/lib/i18n';

const TYPE_META: Record<string, { titleKey: TranslationKey; icon: LucideIcon }> =
    {
        order_new: { titleKey: 'notifications.order_new', icon: ShoppingBag },
        review_new: { titleKey: 'notifications.review_new', icon: Star },
        order_status: { titleKey: 'notifications.order_status', icon: Package },
        payment_confirmed: {
            titleKey: 'notifications.payment_confirmed',
            icon: BadgeCheck,
        },
        payment_received: {
            titleKey: 'notifications.payment_received',
            icon: Wallet,
        },
        low_stock: {
            titleKey: 'notifications.low_stock',
            icon: AlertTriangle,
        },
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

export function NotificationBell() {
    const router = useRouter();
    const { t } = useI18n();
    const { notifications, unread, markRead, markAll } = useNotifications();
    const [open, setOpen] = useState(false);

    function describe(n: AppNotification): string {
        const d = n.data ?? {};
        if (n.type === 'order_new') {
            const num = String(d.orderNumber ?? '');
            return d.hasProof
                ? `${num} · ${t('notifications.order_proof')}`
                : num;
        }
        if (n.type === 'review_new') return String(d.productName ?? '');
        if (n.type === 'low_stock') {
            const sku = d.variantSku ? ` (${String(d.variantSku)})` : '';
            return `${String(d.productName ?? '')}${sku} · ${d.remaining ?? 0} left`;
        }
        if (n.type === 'payment_received') {
            const num = String(d.orderNumber ?? '');
            const branch = d.branchName ? ` · ${String(d.branchName)}` : '';
            const count = d.itemCount ? ` · ${d.itemCount}×` : '';
            return `${num}${count}${branch}`;
        }
        return String(d.orderNumber ?? '');
    }

    function onItemClick(n: AppNotification) {
        if (!n.isRead) markRead.mutate(n.id);
        setOpen(false);
        if (n.link) router.push(n.link);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-full border border-neutral-200 dark:border-neutral-800"
                        aria-label={t('notifications.title')}
                    >
                        <Bell className="size-4" />
                        {unread > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold leading-4 text-white">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </Button>
                }
            />
            <PopoverContent
                align="end"
                className="w-80 gap-0 overflow-hidden p-0"
            >
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <p className="text-sm font-semibold">
                        {t('notifications.title')}
                    </p>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={() => markAll.mutate()}
                            className="text-xs font-medium text-pink-600 hover:underline dark:text-pink-400"
                        >
                            {t('notifications.markAllRead')}
                        </button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Bell className="size-7 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            {t('notifications.empty')}
                        </p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto py-1">
                        {notifications.map((n) => {
                            const meta = TYPE_META[n.type];
                            const Icon = meta?.icon ?? Bell;
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => onItemClick(n)}
                                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent ${
                                        n.isRead ? '' : 'bg-pink-50/60 dark:bg-pink-500/5'
                                    }`}
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium">
                                            {meta
                                                ? t(meta.titleKey)
                                                : n.type}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {describe(n)}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                        {timeAgo(n.createdAt)}
                                    </span>
                                    {!n.isRead && (
                                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-pink-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
