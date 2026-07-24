'use client';

import { Monitor, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type {
    OrderPaymentStatus,
    OrderSource,
    OrderStatus,
} from '@/types/order';

const STATUS_STYLES: Record<OrderStatus, { bg: string; dot: string }> = {
    // Pay-first checkout not paid yet (hidden from the list) — slate.
    awaiting_payment: {
        bg: 'bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-500/15 dark:text-slate-300 dark:hover:bg-slate-500/15',
        dot: 'bg-slate-400 dark:bg-slate-500',
    },
    // Awaiting action — amber, the universal "pending" colour.
    pending: {
        bg: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    // Money received — blue.
    paid: {
        bg: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/15',
        dot: 'bg-blue-500 dark:bg-blue-400',
    },
    // Being prepared — indigo.
    processing: {
        bg: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/15',
        dot: 'bg-indigo-500 dark:bg-indigo-400',
    },
    // On the way — violet.
    shipped: {
        bg: 'bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/15',
        dot: 'bg-violet-500 dark:bg-violet-400',
    },
    // Done — green.
    completed: {
        bg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
    },
    // Voided before fulfilment — neutral grey.
    cancelled: {
        bg: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/15',
        dot: 'bg-zinc-400 dark:bg-zinc-500',
    },
    // Unpaid pay-first hold that lapsed (hidden from the list) — neutral grey.
    expired: {
        bg: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/15',
        dot: 'bg-zinc-400 dark:bg-zinc-500',
    },
    // Money returned — red.
    refunded: {
        bg: 'bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15',
        dot: 'bg-rose-500 dark:bg-rose-400',
    },
};

const STATUS_LABELS: Record<OrderStatus, TranslationKey> = {
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

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const { t } = useI18n();
    const style = STATUS_STYLES[status];
    return (
        <Badge className={style.bg}>
            <span
                className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`}
            />
            {t(STATUS_LABELS[status])}
        </Badge>
    );
}

const PAYMENT_STATUS_STYLES: Record<OrderPaymentStatus, string> = {
    paid: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300',
    partial: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300',
    unpaid: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-300',
    refunded: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300',
};
const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, TranslationKey> = {
    paid: 'order.payment.paid',
    partial: 'order.payment.partial',
    unpaid: 'order.payment.unpaid',
    refunded: 'order.payment.refunded',
};

export function PaymentStatusBadge({
    status,
}: {
    status: OrderPaymentStatus;
}) {
    const { t } = useI18n();
    return (
        <Badge className={PAYMENT_STATUS_STYLES[status]}>
            {t(PAYMENT_STATUS_LABELS[status])}
        </Badge>
    );
}

export function OrderSourceBadge({ source }: { source: OrderSource }) {
    const { t } = useI18n();
    const Icon = source === 'in_store' ? Store : Monitor;
    return (
        <Badge
            variant="outline"
            className="border-border bg-muted/50 text-muted-foreground"
        >
            <Icon className="mr-1 size-3" />
            {t(
                source === 'in_store'
                    ? 'order.source.in_store'
                    : 'order.source.online',
            )}
        </Badge>
    );
}
