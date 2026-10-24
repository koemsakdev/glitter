import {
    AlertTriangle,
    BadgeCheck,
    Package,
    ShoppingBag,
    Star,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import type { AppNotification } from '@/features/notifications/notification-api';
import type { TranslationKey } from '@/lib/i18n';

export const TYPE_META: Record<
    string,
    { titleKey: TranslationKey; icon: LucideIcon }
> = {
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

/** One-line detail for a notification (order number, product, …). */
export function describeNotification(
    n: AppNotification,
    t: (key: TranslationKey) => string,
): string {
    const d = n.data ?? {};
    if (n.type === 'order_new') {
        const num = String(d.orderNumber ?? '');
        return d.hasProof ? `${num} · ${t('notifications.order_proof')}` : num;
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

/** Where clicking a notification goes. Order notifications open that order
 * (older "new order" entries were saved with just the list link). */
export function notificationHref(n: AppNotification): string | null {
    const orderId = typeof n.data?.orderId === 'string' ? n.data.orderId : null;
    return orderId && (!n.link || n.link === '/dashboard/orders')
        ? `/dashboard/orders/${orderId}`
        : n.link;
}
