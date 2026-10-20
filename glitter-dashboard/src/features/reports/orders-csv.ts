import type { TranslationKey } from '@/lib/i18n';
import type { OrderExportRow } from './reports-api';

export const PAY_LABEL: Record<string, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'reports.method.aba',
    cod: 'order.payment.method.cod',
    other: 'reports.other',
};
export const STATUS_LABEL: Record<string, TranslationKey> = {
    awaiting_payment: 'order.status.awaiting_payment',
    pending: 'order.status.pending',
    paid: 'order.status.paid',
    processing: 'order.status.processing',
    shipped: 'order.status.shipped',
    completed: 'order.status.completed',
    cancelled: 'order.status.cancelled',
    expired: 'order.status.expired',
    refunded: 'order.status.refunded',
};
export const DELIVERY_LABEL: Record<string, TranslationKey> = {
    grab: 'order.delivery.grab',
    cod: 'order.delivery.cod',
    pickup: 'order.delivery.pickup',
    vet_express: 'order.delivery.vetExpress',
};

/**
 * One clean table: a row per order (every status — cancelled ones too, with
 * a "Counted as sale" column), then a total row. Only days that had orders
 * appear, because only real orders are listed.
 */
export function toCsv(
    rows: OrderExportRow[],
    t: (k: TranslationKey) => string,
): string {
    const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const money = (n: number) => n.toFixed(2);
    const label = (map: Record<string, TranslationKey>, v: string) =>
        map[v] ? t(map[v]) : v;
    const head = [
        'Order #',
        'Date',
        'Time',
        'Status',
        'Counted as sale',
        'Payment status',
        'Payment method',
        'Branch',
        'Customer',
        'Phone',
        'Items',
        'Products',
        'Subtotal',
        'Discount',
        'Shipping',
        'Total',
    ];
    const body = rows.map((r) => [
        r.orderNumber,
        r.date,
        r.time,
        label(STATUS_LABEL, r.status),
        r.countsAsSale ? 'Yes' : 'No',
        r.paymentStatus,
        label(PAY_LABEL, r.paymentMethod) || '',
        r.branch,
        r.customer,
        // Keep leading zeros on phone numbers when opened in Excel.
        r.phone ? `="${r.phone}"` : '',
        r.items,
        r.products,
        money(r.subtotal),
        money(r.discount),
        money(r.shipping),
        money(r.total),
    ]);
    const sales = rows.filter((r) => r.countsAsSale);
    const sum = (k: 'subtotal' | 'discount' | 'shipping' | 'total') =>
        money(sales.reduce((n, r) => n + r[k], 0));
    const total = [
        `TOTAL (sales: ${sales.length} of ${rows.length} orders)`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        sales.reduce((n, r) => n + r.items, 0),
        '',
        sum('subtotal'),
        sum('discount'),
        sum('shipping'),
        sum('total'),
    ];
    return [head, ...body, [], total]
        .map((row) => row.map(esc).join(','))
        .join('\r\n');
}
