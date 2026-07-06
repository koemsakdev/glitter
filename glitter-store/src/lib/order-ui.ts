import { tr, type Lang } from '@/lib/locale';

/** Colour styles for an order's lifecycle status. */
export const ORDER_STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    paid: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    processing:
        'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    shipped:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
    completed:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    refunded: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

/** Colour styles for a payment status. */
export const PAYMENT_STATUS_STYLE: Record<string, string> = {
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    partial:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    refunded: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export function orderStatusLabel(lang: Lang, status: string): string {
    const key = `os_${status}`;
    const label = tr(lang, key);
    return label === key ? status : label;
}

export function paymentStatusLabel(lang: Lang, status: string): string {
    const key = `ps_${status}`;
    const label = tr(lang, key);
    return label === key ? status : label;
}
