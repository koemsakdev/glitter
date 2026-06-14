'use client';

import { ArrowLeft, Loader2, Phone, Printer, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DetailField,
    DetailSection,
} from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useToast } from '@/hooks/use-toast';
import {
    useOrder,
    useUpdateOrderStatus,
} from '@/features/orders/use-orders';
import { getErrorMessage } from '@/lib/api-client';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import {
    ORDER_TRANSITIONS,
    type Order,
    type OrderStatus,
    type PaymentMethod,
} from '@/types/order';
import { OrderSourceBadge, OrderStatusBadge } from './order-status-badge';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'order.payment.method.aba',
};

function formatDate(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export function OrderDetailView({ id }: { id: string }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data: order, isLoading, isError, refetch } = useOrder(id);
    const updateStatus = useUpdateOrderStatus();

    if (isLoading) return <LoadingScreen variant="page" />;

    if (isError || !order) {
        return (
            <ErrorState
                title={t('order.detail.errorTitle')}
                message={t('order.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const allowedNext = ORDER_TRANSITIONS[order.source]?.[order.status] ?? [];

    function handleStatusChange(next: OrderStatus) {
        updateStatus.mutate(
            { id, status: next },
            {
                onSuccess: () =>
                    toast({
                        title: t('order.toast.statusUpdated'),
                        variant: 'success',
                    }),
                onError: (error) =>
                    toast({
                        title: t('common.toast.error'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    }),
            },
        );
    }

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                            {order.orderNumber}
                        </h1>
                        <OrderStatusBadge status={order.status} />
                        <OrderSourceBadge source={order.source} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                        {order.branchName ? ` · ${order.branchName}` : ''}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href="/dashboard/orders">
                                <ArrowLeft className="mr-2 size-4" />
                                {t('common.back')}
                            </Link>
                        }
                    />
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={
                            <Link href={`/dashboard/orders/${id}/receipt`}>
                                <Printer className="mr-2 size-4" />
                                {t('order.receipt.print')}
                            </Link>
                        }
                    />
                    {allowedNext.map((next) => (
                        <Button
                            key={next}
                            variant="outline"
                            disabled={updateStatus.isPending}
                            onClick={() => handleStatusChange(next)}
                            className={
                                next === 'cancelled' || next === 'refunded'
                                    ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                    : ''
                            }
                        >
                            {updateStatus.isPending && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            {t('order.detail.changeTo')} {t(`order.status.${next}` as const)}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Items + summary (left, 2/3) */}
                <div className="space-y-6 lg:col-span-2">
                    <DetailSection title={t('order.detail.items')}>
                        <OrderItemsTable order={order} />
                    </DetailSection>
                </div>

                {/* Sidebar (right, 1/3) */}
                <div className="space-y-6">
                    {/* Customer */}
                    <DetailSection title={t('order.detail.customer')}>
                        <div className="space-y-2.5">
                            <DetailField label={t('order.col.customer')}>
                                <span className="inline-flex items-center gap-2">
                                    <User className="size-3.5 text-muted-foreground" />
                                    {order.customerName ?? (
                                        <span className="italic text-muted-foreground">
                                            {t('order.customer.walkIn')}
                                        </span>
                                    )}
                                </span>
                            </DetailField>
                            {order.customerPhone && (
                                <DetailField label={t('branch.field.phone')}>
                                    <span className="inline-flex items-center gap-2">
                                        <Phone className="size-3.5 text-muted-foreground" />
                                        <span className="font-mono">
                                            {order.customerPhone}
                                        </span>
                                    </span>
                                </DetailField>
                            )}
                        </div>
                    </DetailSection>

                    {/* Payments */}
                    <DetailSection title={t('order.detail.payments')}>
                        {order.payments.length === 0 ? (
                            <p className="text-sm italic text-muted-foreground">
                                {t('order.detail.noPayments')}
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {order.payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="text-muted-foreground">
                                            {t(PAYMENT_METHOD_LABELS[p.method])}
                                            {p.reference ? (
                                                <span className="ml-1 font-mono text-xs">
                                                    · {p.reference}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {formatPrice(p.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DetailSection>

                    {/* Metadata */}
                    <DetailSection title={t('order.detail.metadata')}>
                        <div className="space-y-2.5">
                            {order.note && (
                                <DetailField label={t('order.detail.note')}>
                                    <span className="whitespace-pre-wrap">
                                        {order.note}
                                    </span>
                                </DetailField>
                            )}
                            <DetailField label={t('order.detail.created')}>
                                {formatDate(order.createdAt)}
                            </DetailField>
                            <DetailField label={t('order.detail.updated')}>
                                {formatDate(order.updatedAt)}
                            </DetailField>
                        </div>
                    </DetailSection>
                </div>
            </div>
        </div>
    );
}

function OrderItemsTable({ order }: { order: Order }) {
    const { t } = useI18n();

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                        <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('order.col.items')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.sku')}
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('order.field.unitPrice')}
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('order.field.qty')}
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('order.field.lineTotal')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {order.items.map((item) => {
                            const variantLabel = [item.size, item.color]
                                .filter(Boolean)
                                .join(' · ');
                            return (
                                <tr key={item.id} className="bg-card">
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            {item.color && item.colorHex && (
                                                <span
                                                    className="inline-block size-4 shrink-0 rounded-full border border-border"
                                                    style={{
                                                        backgroundColor: item.colorHex,
                                                    }}
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">
                                                    {item.productName}
                                                </div>
                                                {variantLabel && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {variantLabel}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="inline-block whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                            {item.variantSku}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {formatPrice(item.unitPrice)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {item.quantity}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                                        {formatPrice(item.lineTotal)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                        {t('order.detail.subtotal')}
                    </span>
                    <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            {t('order.detail.discount')}
                        </span>
                        <span className="tabular-nums text-amber-600 dark:text-amber-400">
                            −{formatPrice(order.discountTotal)}
                        </span>
                    </div>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-bold">
                    <span>{t('order.detail.total')}</span>
                    <span className="tabular-nums text-pink-600 dark:text-pink-300">
                        {formatPrice(order.grandTotal)}
                    </span>
                </div>
            </div>
        </div>
    );
}
