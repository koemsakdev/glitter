import { orderStatusLabel } from '@/lib/order-ui';
import type { Lang } from '@/lib/locale';

export interface AppNotification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationPage {
    data: AppNotification[];
    unread: number;
    /** Older notifications exist beyond this page. */
    hasMore?: boolean;
}

/** Locale key of each notification type's title. */
export const NOTIF_TITLE_KEY: Record<string, string> = {
    order_status: 'notif_order_status',
    payment_confirmed: 'notif_payment_confirmed',
    order_new: 'notif_order_new',
    review_new: 'notif_review_new',
};

/** One-line detail (order number + status, product…). */
export function describeNotification(n: AppNotification, lang: Lang): string {
    const d = n.data ?? {};
    const num = String(d.orderNumber ?? '');
    if (n.type === 'order_status' && d.status) {
        return `${num} · ${orderStatusLabel(lang, String(d.status))}`;
    }
    if (n.type === 'review_new') return String(d.productName ?? '');
    return num;
}

export function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}
